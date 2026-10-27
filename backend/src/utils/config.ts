import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Default known origins for this deployment (public site + admin panel +
// local dev ports). ALLOWED_ORIGINS env var can extend this comma-separated
// without a code change if a domain is added/renamed later.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://kusum-s-dental-care.vercel.app',
  'https://admin-app-lilac-seven.vercel.app',
  'https://kusum-dental-care-admin.vercel.app',
  'https://admin.kusumsdentalcare.in',
  'https://www.kusumsdentalcare.in',
  'https://kusumsdentalcare.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
];

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  // Env origins EXTEND the defaults (never replace them), so a stale
  // ALLOWED_ORIGINS on Vercel can't lock out the known admin/public domains.
  allowedOrigins: [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) ?? []),
  ],
  doctorUserId: process.env.DOCTOR_USER_ID ?? '074d63b2-5617-4d4a-a387-029ab6c3d4bc',
  // Where Supabase sends people after they click the confirmation link in the
  // sign-up email. Must also be listed under Redirect URLs in Supabase Auth,
  // or Supabase silently falls back to the project's Site URL.
  adminAppUrl: (process.env.ADMIN_APP_URL ?? 'https://admin.kusumsdentalcare.in').replace(/\/$/, ''),
};
