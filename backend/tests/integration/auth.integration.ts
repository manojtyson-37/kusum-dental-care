import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { supabaseAdmin } from '../../src/lib/supabase.js';

/**
 * Requires a running Supabase instance (`supabase start` locally, or a real
 * project) reachable at SUPABASE_URL with SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY set, and migrations from supabase/migrations
 * applied. Skipped automatically if SKIP_INTEGRATION=1 is set (e.g. CI
 * without a Supabase instance available).
 */
const describeIfSupabase = process.env.SKIP_INTEGRATION === '1' ? describe.skip : describe;

describeIfSupabase('Auth integration', () => {
  let app: FastifyInstance;
  // Supabase Auth's deliverability check rejects known non-routable domains
  // like example.com/example.org — use a real, routable domain.
  const email = `kusum.dental.integration.test+${Date.now()}@gmail.com`;
  const password = 'password123';
  let userId: string | undefined;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    await app.close();
  });

  it('registers a new user (pending email confirmation)', async () => {
    const res = await request(app.server)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: 'Integration Test' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.requiresEmailConfirmation).toBe(true);
    expect(res.body.accessToken).toBeNull();
    userId = res.body.user.id;

    // Confirm the email out-of-band via the admin API — mirrors what
    // clicking the confirmation link would do — so the rest of this suite
    // can exercise the normal login flow.
    await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
  });

  it('logs in with the registered credentials', async () => {
    const res = await request(app.server).post('/api/v1/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('allows the authenticated user to access their profile', async () => {
    const login = await request(app.server).post('/api/v1/auth/login').send({ email, password });

    const res = await request(app.server)
      .get('/api/v1/patients/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it("rejects access to another patient's data", async () => {
    const login = await request(app.server).post('/api/v1/auth/login').send({ email, password });

    const res = await request(app.server)
      .get('/api/v1/patients/00000000-0000-0000-0000-000000000000/history')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app.server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });
});
