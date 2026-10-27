import { createClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { ConflictError, RateLimitError, UnauthorizedError } from '../utils/errors.js';
import { supabaseAdmin, type UserRole } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface RegisterResult {
  user: PublicUser;
  accessToken: string | null;
  refreshToken: string | null;
  requiresEmailConfirmation: boolean;
}

/**
 * A fresh, unauthenticated client per call — auth methods here don't need
 * RLS context and must not share state across requests (autoRefreshToken/
 * persistSession are disabled so tokens are handled explicitly per call).
 */
function anonClient() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const STAFF_ROLES: UserRole[] = ['DENTIST', 'STAFF', 'ADMIN'];

/**
 * Every account in this deployment is an admin: the panel is a personal
 * dashboard for the clinic's one doctor and patients never log in (see
 * ADMIN_OPEN_ACCESS in middleware/auth.ts).
 *
 * The handle_new_user trigger still stamps new accounts PATIENT, which the
 * RLS policies treat as non-staff — so without this promotion a new account
 * signs in fine and then sees an empty dashboard, because every query is
 * filtered to zero rows rather than refused outright.
 *
 * Returns the role now in force. Never throws: failing to promote should not
 * stop someone signing in.
 */
async function promoteToAdmin(userId: string, current?: UserRole | null): Promise<UserRole> {
  if (current && STAFF_ROLES.includes(current)) return current;

  const { error } = await supabaseAdmin.rpc('set_user_role', {
    target_user_id: userId,
    new_role: 'ADMIN',
  });

  if (error) {
    logger.warn('Could not promote account to ADMIN', { userId, error: error.message });
    return current ?? 'PATIENT';
  }
  return 'ADMIN';
}

export class AuthService {
  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<RegisterResult> {
    // Ordinary anon signUp so Supabase sends its confirmation email. The link
    // lands on the admin app's /auth/callback, which exchanges the code for a
    // session exactly as the Google flow does.
    //
    // NOTE: Supabase's built-in mailer allows only a few messages per hour per
    // project, shared across every auth email. Past that it answers 429 and no
    // account is created at all. Configure custom SMTP in Supabase to lift it.
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${config.adminAppUrl}/auth/callback`,
      },
    });

    if (error) {
      const alreadyExists = error.status === 422
        || /already (been )?registered|already exists/i.test(error.message);
      if (alreadyExists) {
        throw new ConflictError('Email already registered');
      }
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        throw new RateLimitError(
          'Too many confirmation emails have been sent from this project in the '
          + 'last hour, so the account was not created. Wait an hour and try '
          + 'again, or configure custom SMTP in Supabase to remove this limit.',
        );
      }
      throw new UnauthorizedError(error.message);
    }

    if (!data.user) {
      throw new UnauthorizedError('Registration failed');
    }

    // Promote now, while the account is brand new. The confirmation link mints
    // a fresh token afterwards, so it carries ADMIN from the very first session.
    const role = await promoteToAdmin(data.user.id, data.user.app_metadata?.role as UserRole);

    const user: PublicUser = {
      id: data.user.id,
      email: data.user.email!,
      fullName,
      role,
    };

    // With confirmation enabled, signUp creates the account but returns no
    // session until the emailed link is clicked. Report that rather than
    // pretending the caller is signed in.
    if (!data.session) {
      return {
        user,
        accessToken: null,
        refreshToken: null,
        requiresEmailConfirmation: true,
      };
    }

    return {
      user,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      requiresEmailConfirmation: false,
    };
  }

  async login(email: string, password: string): Promise<{ user: PublicUser } & AuthTokens> {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const { data: profile } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', data.user.id)
      .single();

    // Role comes from app_metadata (JWT-embedded), the same source
    // authenticate()/authorize() trust for every subsequent request — never
    // from profiles.role, which can drift from it (e.g. a direct SQL edit
    // that forgot to call set_user_role()) and would otherwise let the
    // login response disagree with what the token actually authorizes.
    const currentRole = data.user.app_metadata?.role as UserRole | undefined;
    const role = await promoteToAdmin(data.user.id, currentRole);

    let { session } = data;
    if (role !== currentRole) {
      // The token in hand still carries the old role, and RLS reads the role
      // from the token — so sign in again to mint one that says ADMIN.
      // Without this the first session after promotion still sees no rows.
      const { data: fresh } = await client.auth.signInWithPassword({ email, password });
      if (fresh.session) session = fresh.session;
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: profile?.full_name ?? '',
        role,
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  }

  /**
   * Used by OAuth sign-in (Google, etc.): the browser talks to Supabase
   * Auth directly and already holds a valid session by the time it reaches
   * us, so there's no password to check here — this just turns that
   * already-issued token into the same {user, accessToken, refreshToken}
   * shape login() returns, resolving role from app_metadata exactly the
   * same way, so the rest of the app (and requireDoctor) can't tell the
   * two paths apart.
   */
  async sessionFromToken(accessToken: string, refreshToken: string): Promise<{ user: PublicUser } & AuthTokens> {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new UnauthorizedError('Invalid session');
    }

    const { data: profile } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', data.user.id)
      .single();

    const currentRole = data.user.app_metadata?.role as UserRole | undefined;
    const role = await promoteToAdmin(data.user.id, currentRole);

    // Google sign-ins arrive with a token minted before the promotion, so
    // refresh it to pick up the new role claim — otherwise RLS filters this
    // first session down to nothing.
    let tokens = { accessToken, refreshToken };
    if (role !== currentRole) {
      const { data: fresh } = await client.auth.refreshSession({ refresh_token: refreshToken });
      if (fresh.session) {
        tokens = {
          accessToken: fresh.session.access_token,
          refreshToken: fresh.session.refresh_token,
        };
      }
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: profile?.full_name ?? '',
        role,
      },
      ...tokens,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    const client = anonClient();
    const { data, error } = await client.auth.refreshSession({ refresh_token: token });

    if (error || !data.session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    return { accessToken: data.session.access_token };
  }

  async logout(accessToken: string): Promise<void> {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    await client.auth.signOut();
  }
}
