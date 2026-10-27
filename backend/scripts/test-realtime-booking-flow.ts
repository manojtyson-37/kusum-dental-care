/**
 * End-to-end test: a booking request arriving → admin processing it →
 * treatment sessions and payment status appearing live on the admin
 * dashboard, with zero manual reload.
 *
 * Exercises the real HTTP API (not direct DB writes) for every step a
 * human would actually perform, and asserts Supabase Realtime fires a
 * postgres_changes event for each write — the same mechanism the admin
 * frontend's useRealtimeTables() hook relies on.
 *
 * Usage:
 *   cd backend && npx tsx scripts/test-realtime-booking-flow.ts
 *
 * Env:
 *   TEST_API_URL   defaults to the production deployment
 *   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY   from .env
 *
 * Writes a timestamped JSON + Markdown report to backend/test-results/,
 * and always tears down every account/row it created — pass or fail.
 */
import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'test-results');

const API_URL = process.env.TEST_API_URL ?? 'https://kusum-s-dental-care.vercel.app/api/v1';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type StepResult = { name: string; status: 'PASS' | 'FAIL'; detail: string; ms: number };
const results: StepResult[] = [];
const runId = new Date().toISOString().replace(/[:.]/g, '-');

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  process.stdout.write(`→ ${name}... `);
  try {
    const value = await fn();
    const ms = Date.now() - t0;
    const detail = typeof value === 'string' ? value : safeStringify(value);
    results.push({ name, status: 'PASS', detail, ms });
    console.log(`PASS (${ms}ms)`);
    return value;
  } catch (err) {
    const ms = Date.now() - t0;
    const detail = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'FAIL', detail, ms });
    console.log(`FAIL (${ms}ms) — ${detail}`);
    throw err;
  }
}

async function api(path: string, opts: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${rest.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

type RealtimeEvent = { table: string; eventType: string; receivedAt: number };

/**
 * One persistent channel listening to all four tables, subscribed and
 * confirmed SUBSCRIBED before returning — postgres_changes is a live
 * stream with no backlog, so a write that happens before the socket
 * handshake completes is simply never seen. Every event received (from
 * setup onward) is logged so a later waitFor() can find events that
 * arrived just before it started polling.
 */
async function openRealtimeLog(rtClient: SupabaseClient, tables: string[]) {
  const log: RealtimeEvent[] = [];
  const channel = rtClient.channel(`test-run-${Math.random().toString(36).slice(2)}`);
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      log.push({ table, eventType: payload.eventType, receivedAt: Date.now() });
    });
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('realtime channel did not reach SUBSCRIBED within 10s')), 10000);
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new Error(`realtime subscribe failed: ${status} ${err?.message ?? ''}`));
      }
    });
  });

  return {
    log,
    channel,
    /** Waits for a table event logged at/after `since`, polling the shared log. */
    async waitFor(table: string, since: number, timeoutMs = 8000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const hit = log.find((e) => e.table === table && e.receivedAt >= since);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`no realtime event on ${table} within ${timeoutMs}ms (log has ${log.length} events total)`);
    },
  };
}

async function main() {
  const suffix = Date.now();
  const patientEmail = `kusum.dental.autotest.patient+${suffix}@gmail.com`;
  const adminEmail = `kusum.dental.autotest.admin+${suffix}@gmail.com`;
  const password = 'AutoTest123!';

  let patientId = '';
  let adminUserId = '';
  let adminToken = '';
  let adminRefreshToken = '';
  let serviceId = '';
  let staffId = '';
  let appointmentId = '';
  let visitId = '';
  let invoiceId = '';
  let paymentId = '';

  try {
    // ---- Setup ------------------------------------------------------
    patientId = await step('setup: create QA patient account', async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email: patientEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Autotest Patient' },
      });
      if (error || !data.user) throw new Error(error?.message ?? 'createUser failed');
      await admin.from('patients').upsert({ id: data.user.id });
      return data.user.id;
    });

    adminUserId = await step('setup: create QA admin account (via set_user_role)', async () => {
      const { data, error } = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
      if (error || !data.user) throw new Error(error?.message ?? 'createUser failed');
      const { error: roleErr } = await admin.rpc('set_user_role', { target_user_id: data.user.id, new_role: 'ADMIN' });
      if (roleErr) throw new Error(roleErr.message);
      return data.user.id;
    });

    adminToken = await step('auth: admin logs in via POST /auth/login', async () => {
      const body = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: adminEmail, password }) });
      if (body.user.role !== 'ADMIN') throw new Error(`expected role ADMIN, got ${body.user.role}`);
      adminRefreshToken = body.refreshToken as string;
      return body.accessToken as string;
    });

    ({ id: serviceId } = await step('setup: fetch a real service id', async () => {
      const { data, error } = await admin.from('services').select('id').limit(1).single();
      if (error || !data) throw new Error(error?.message ?? 'no services found');
      return data;
    }));

    ({ id: staffId } = await step('setup: fetch a real staff id', async () => {
      const { data, error } = await admin.from('profiles').select('id').in('role', ['DENTIST', 'STAFF', 'ADMIN']).limit(1).single();
      if (error || !data) throw new Error(error?.message ?? 'no staff found');
      return data;
    }));

    const rtClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    await step('realtime: authenticate the subscription as the admin', async () => {
      const { error } = await rtClient.auth.setSession({ access_token: adminToken, refresh_token: adminRefreshToken });
      if (error) throw new Error(error.message);
      return 'session set';
    });

    const rt = await step('realtime: open channel and wait for SUBSCRIBED', () =>
      openRealtimeLog(rtClient, ['appointments', 'payments', 'visit_logs', 'invoices']),
    );

    // ---- Booking → appointment (what admin does after the WhatsApp ping) --
    const dashboardBefore = await step('baseline: GET /admin/dashboard before any writes', () =>
      api('/admin/dashboard', { token: adminToken }),
    );

    const apptSince = Date.now();
    appointmentId = await step('POST /admin/appointments (booking processed)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const body = await api('/admin/appointments', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify({
          patientId,
          staffId,
          serviceId,
          appointmentDate: today,
          startTime: '15:00:00',
          endTime: '15:30:00',
          notes: 'automated test — booking simulated',
        }),
      });
      return body.id as string;
    });
    await step('realtime: appointment INSERT event received', () => rt.waitFor('appointments', apptSince));

    await step('dashboard reflects the new appointment (appointmentsToday +1)', async () => {
      const after = await api('/admin/dashboard', { token: adminToken });
      const delta = after.appointmentsToday - dashboardBefore.appointmentsToday;
      if (delta < 1) throw new Error(`expected appointmentsToday to increase, before=${dashboardBefore.appointmentsToday} after=${after.appointmentsToday}`);
      return `appointmentsToday ${dashboardBefore.appointmentsToday} -> ${after.appointmentsToday}`;
    });

    await step('appointments list contains the new booking', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const list = await api(`/admin/appointments?date=${today}`, { token: adminToken });
      const found = list.find((a: { id: string }) => a.id === appointmentId);
      if (!found) throw new Error('new appointment not present in GET /admin/appointments');
      return found;
    });

    // ---- Treatment session (visit log) — "remaining treatment sessions" --
    const visitSince = Date.now();
    visitId = await step('POST /admin/visits (treatment session logged)', async () => {
      const body = await api('/admin/visits', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify({
          patientId,
          treatment: 'Automated test — Root Canal Session 1 of 3',
          clinicalNotes: 'autotest',
          amountCharged: 1500,
        }),
      });
      return body.id as string;
    });
    await step('realtime: visit_logs INSERT event received', () => rt.waitFor('visit_logs', visitSince));

    // ---- Payment / invoice ------------------------------------------
    const invoiceSince = Date.now();
    invoiceId = await step('POST /admin/invoices (receipt generated)', async () => {
      const body = await api('/admin/invoices', {
        method: 'POST',
        token: adminToken,
        body: JSON.stringify({ patientId, items: [{ description: 'Root Canal Session 1', amount: 1500 }] }),
      });
      if (!body.url) throw new Error('invoice created but no signed PDF url returned');
      return body.id as string;
    });
    await step('realtime: invoices INSERT event received', () => rt.waitFor('invoices', invoiceSince));

    // Legacy payments table too — some dashboard stats read from it directly.
    const paymentSince = Date.now();
    paymentId = await step('setup: record a legacy payment row (service_role, mirrors admin UI)', async () => {
      const { data, error } = await admin
        .from('payments')
        .insert({ appointment_id: appointmentId, patient_id: patientId, amount: 1500, currency: 'INR', status: 'PENDING' })
        .select('id')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'payment insert failed');
      return data.id;
    });
    await step('realtime: payments INSERT event received', () => rt.waitFor('payments', paymentSince));

    await step('patient record reflects outstanding balance + visit history', async () => {
      const record = await api(`/admin/patients/${patientId}/record`, { token: adminToken });
      if (record.outstandingBalance < 1500) throw new Error(`expected outstandingBalance >= 1500, got ${record.outstandingBalance}`);
      const hasVisit = record.visits.some((v: { id: string }) => v.id === visitId);
      if (!hasVisit) throw new Error('new visit not present in patient record');
      return { outstandingBalance: record.outstandingBalance, visitCount: record.visits.length };
    });

    rtClient.removeAllChannels();
  } finally {
    // ---- Teardown — always runs, pass or fail ------------------------
    console.log('\nCleaning up...');
    if (paymentId) await admin.from('payments').delete().eq('id', paymentId).then(() => console.log('  deleted payment'));
    if (invoiceId) {
      const { data } = await admin.from('invoices').select('storage_path').eq('id', invoiceId).single();
      if (data?.storage_path) await admin.storage.from('patient-files').remove([data.storage_path]);
      await admin.from('invoices').delete().eq('id', invoiceId);
      console.log('  deleted invoice + PDF');
    }
    if (visitId) await admin.from('visit_logs').delete().eq('id', visitId).then(() => console.log('  deleted visit log'));
    if (appointmentId) await admin.from('appointments').delete().eq('id', appointmentId).then(() => console.log('  deleted appointment'));
    if (adminUserId) {
      await admin.from('audit_logs').delete().eq('user_id', adminUserId);
      await admin.auth.admin.deleteUser(adminUserId);
      console.log('  deleted QA admin account + its audit logs');
    }
    if (patientId) {
      await admin.from('audit_logs').delete().eq('user_id', patientId);
      await admin.auth.admin.deleteUser(patientId);
      console.log('  deleted QA patient account');
    }
  }
}

async function run() {
  const startedAt = new Date();
  let failed = false;
  try {
    await main();
  } catch {
    failed = true;
  }
  const finishedAt = new Date();

  mkdirSync(RESULTS_DIR, { recursive: true });
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  const report = {
    runId,
    apiUrl: API_URL,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    overall: failed ? 'FAIL' : 'PASS',
    passCount,
    failCount,
    steps: results,
  };

  const jsonPath = path.join(RESULTS_DIR, `${runId}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    `# Realtime booking flow — ${report.overall}`,
    '',
    `Run: ${report.startedAt} · API: ${API_URL} · Duration: ${report.durationMs}ms`,
    `${passCount} passed, ${failCount} failed`,
    '',
    '| Step | Status | Time | Detail |',
    '|---|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.status} | ${r.ms}ms | ${r.detail.replace(/\|/g, '\\|').slice(0, 200)} |`),
    '',
  ].join('\n');
  const mdPath = path.join(RESULTS_DIR, `${runId}.md`);
  writeFileSync(mdPath, md);

  console.log(`\n${report.overall}: ${passCount} passed, ${failCount} failed`);
  console.log(`Report: ${jsonPath}`);
  console.log(`Report: ${mdPath}`);

  process.exit(failed ? 1 : 0);
}

run();
