# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a doctor/staff-only admin dashboard: login, today's appointments + stats, patient list/detail/create, appointment booking/status updates, and a payments ledger with CSV export.

**Architecture:** New `/api/v1/admin/*` route group on the existing Fastify backend (role-gated, RLS-enforced via `supabase-js`), plus a new standalone `admin/` Vite+React app that calls it. No new database tables — reuses `profiles`, `patients`, `appointments`, `payments`, `services`.

**Tech Stack:** Node 20 · Fastify · TypeScript (strict) · Supabase (Postgres + Auth + RLS) · @supabase/supabase-js · Joi · Jest (backend). Vite + React 18 + `react-router-dom` (admin frontend, no test runner).

**Spec:** `docs/superpowers/specs/2026-08-28-admin-dashboard-design.md`

## Global Constraints

- No hard-delete endpoints — only status transitions (cancelled, no-show, refunded).
- Every admin route requires `authenticate` + `authorize(['DENTIST','STAFF','ADMIN'])`.
- Every data-access method takes a `supabase-js` client scoped to the caller's token (RLS-enforced), matching the existing `PatientService`/`ServiceService` pattern — never bypass RLS for user-facing reads/writes. The one documented exception is walk-in patient creation (Task 3), which needs `supabaseAdmin` for `auth.admin.createUser` and the immediately-following profile fields, because `profiles` has no staff-update RLS policy yet.
- Follow existing error classes (`backend/src/utils/errors.ts`): `NotFoundError`, `ValidationError`, `ConflictError`.
- Backend tests use `jest.unstable_mockModule` to mock `@supabase/supabase-js`, matching `backend/tests/unit/auth.test.ts`. Run with `npm test` inside `backend/`.
- Admin frontend has no test runner — verified via manual Playwright smoke pass at the end.

---

### Task 1: AppointmentService

**Files:**
- Create: `backend/src/services/AppointmentService.ts`
- Test: `backend/tests/unit/appointmentService.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` from `@supabase/supabase-js`; `NotFoundError` from `../utils/errors.js`
- Produces:
  - `class AppointmentService`
    - `listByDate(client: SupabaseClient, filters: { date?: string; status?: string }): Promise<unknown[]>`
    - `create(client: SupabaseClient, data: { patientId: string; staffId: string; serviceId: string; appointmentDate: string; startTime: string; endTime: string; notes?: string }): Promise<unknown>`
    - `updateStatus(client: SupabaseClient, id: string, data: { status?: string; cancelledReason?: string; appointmentDate?: string; startTime?: string; endTime?: string; notes?: string }): Promise<unknown>`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/unit/appointmentService.test.ts
import { jest } from '@jest/globals';

function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'range', 'insert', 'update'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(result));
  (chain as any).then = (resolve: (v: unknown) => unknown) => resolve(result).then
    ? resolve(result)
    : Promise.resolve(result).then(resolve);
  return chain;
}

const { AppointmentService } = await import('../../src/services/AppointmentService.js');
const { NotFoundError } = await import('../../src/utils/errors.js');

describe('AppointmentService.listByDate', () => {
  it('filters by date and status', async () => {
    const chain = buildChain({ data: [{ id: 'appt-1' }], error: null });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new AppointmentService();
    const result = await service.listByDate(client, { date: '2026-08-28', status: 'SCHEDULED' });

    expect(client.from).toHaveBeenCalledWith('appointments');
    expect(chain.eq).toHaveBeenCalledWith('appointment_date', '2026-08-28');
    expect(chain.eq).toHaveBeenCalledWith('status', 'SCHEDULED');
    expect(result).toEqual([{ id: 'appt-1' }]);
  });
});

describe('AppointmentService.create', () => {
  it('inserts a new appointment and returns it', async () => {
    const chain = buildChain({ data: { id: 'appt-2' }, error: null });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new AppointmentService();
    const result = await service.create(client, {
      patientId: 'p1',
      staffId: 's1',
      serviceId: 'svc1',
      appointmentDate: '2026-08-29',
      startTime: '10:00',
      endTime: '10:30',
    });

    expect(chain.insert).toHaveBeenCalled();
    expect(result).toEqual({ id: 'appt-2' });
  });
});

describe('AppointmentService.updateStatus', () => {
  it('throws NotFoundError when the appointment does not exist', async () => {
    const chain = buildChain({ data: null, error: { message: 'no rows' } });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new AppointmentService();

    await expect(service.updateStatus(client, 'missing-id', { status: 'CANCELLED' })).rejects.toThrow(
      NotFoundError,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `npm test -- appointmentService`
Expected: FAIL with "Cannot find module '../../src/services/AppointmentService.js'"

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/services/AppointmentService.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface AppointmentListFilters {
  date?: string;
  status?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  staffId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateAppointmentInput {
  status?: string;
  cancelledReason?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

/**
 * All methods take the caller's RLS-scoped client — appointments RLS
 * already allows patient-self or is_staff() reads/writes, so no app-level
 * role re-check is needed here (see supabase/migrations/..._rls_policies.sql).
 */
export class AppointmentService {
  async listByDate(client: SupabaseClient, filters: AppointmentListFilters = {}) {
    const date = filters.date ?? new Date().toISOString().slice(0, 10);

    let query = client
      .from('appointments')
      .select(
        `id, appointment_date, start_time, end_time, status, notes, cancelled_reason,
         patient:profiles!appointments_patient_id_fkey(id, full_name, phone),
         staff:profiles!appointments_staff_id_fkey(id, full_name),
         service:services(id, name, base_price, duration_minutes)`,
      )
      .eq('appointment_date', date)
      .order('start_time', { ascending: true });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return data;
  }

  async create(client: SupabaseClient, data: CreateAppointmentInput) {
    const { data: row, error } = await client
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        staff_id: data.staffId,
        service_id: data.serviceId,
        appointment_date: data.appointmentDate,
        start_time: data.startTime,
        end_time: data.endTime,
        notes: data.notes,
      })
      .select()
      .single();

    if (error || !row) throw new NotFoundError(error?.message ?? 'Failed to create appointment');

    return row;
  }

  async updateStatus(client: SupabaseClient, id: string, data: UpdateAppointmentInput) {
    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.cancelledReason) update.cancelled_reason = data.cancelledReason;
    if (data.appointmentDate) update.appointment_date = data.appointmentDate;
    if (data.startTime) update.start_time = data.startTime;
    if (data.endTime) update.end_time = data.endTime;
    if (data.notes !== undefined) update.notes = data.notes;

    const { data: row, error } = await client
      .from('appointments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !row) throw new NotFoundError('Appointment not found');

    return row;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- appointmentService`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/services/AppointmentService.ts tests/unit/appointmentService.test.ts
git commit -m "feat: add AppointmentService for admin appointment CRUD"
```

---

### Task 2: PaymentService

**Files:**
- Create: `backend/src/services/PaymentService.ts`
- Test: `backend/tests/unit/paymentService.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient`, `NotFoundError` (same as Task 1)
- Produces:
  - `class PaymentService`
    - `list(client: SupabaseClient, filters: { status?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }): Promise<unknown[]>`
    - `create(client: SupabaseClient, data: { appointmentId: string; patientId: string; amount: number; currency?: string; paymentMethod?: string; status?: string; paymentDate?: string }): Promise<unknown>`
    - `updateStatus(client: SupabaseClient, id: string, data: { status?: string; paymentDate?: string; receiptUrl?: string }): Promise<unknown>`
    - `exportCsv(client: SupabaseClient, filters: { fromDate?: string; toDate?: string }): Promise<string>`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/unit/paymentService.test.ts
import { jest } from '@jest/globals';

function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'range', 'insert', 'update'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(result));
  (chain as any).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const { PaymentService } = await import('../../src/services/PaymentService.js');
const { NotFoundError } = await import('../../src/utils/errors.js');

describe('PaymentService.list', () => {
  it('filters by status and date range', async () => {
    const chain = buildChain({
      data: [
        {
          id: 'pay-1',
          amount: 4500,
          status: 'COMPLETED',
          payment_date: '2026-08-28T10:00:00Z',
          patient: { full_name: 'Jane Doe' },
          appointment: { service: { name: 'Root Canal Treatment' } },
        },
      ],
      error: null,
    });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new PaymentService();
    const result = await service.list(client, {
      status: 'COMPLETED',
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
    });

    expect(chain.eq).toHaveBeenCalledWith('status', 'COMPLETED');
    expect(chain.gte).toHaveBeenCalledWith('payment_date', '2026-08-01');
    expect(chain.lte).toHaveBeenCalledWith('payment_date', '2026-08-31');
    expect(result).toHaveLength(1);
  });
});

describe('PaymentService.create', () => {
  it('inserts a payment and returns it', async () => {
    const chain = buildChain({ data: { id: 'pay-2', amount: 8000 }, error: null });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new PaymentService();
    const result = await service.create(client, {
      appointmentId: 'appt-1',
      patientId: 'p1',
      amount: 8000,
    });

    expect(chain.insert).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pay-2', amount: 8000 });
  });
});

describe('PaymentService.updateStatus', () => {
  it('throws NotFoundError when the payment does not exist', async () => {
    const chain = buildChain({ data: null, error: { message: 'no rows' } });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new PaymentService();

    await expect(service.updateStatus(client, 'missing', { status: 'REFUNDED' })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('PaymentService.exportCsv', () => {
  it('builds a CSV with header and one row per payment', async () => {
    const chain = buildChain({
      data: [
        {
          payment_date: '2026-08-28T10:00:00Z',
          amount: 4500,
          status: 'COMPLETED',
          payment_method: 'cash',
          patient: { full_name: 'Jane Doe' },
          appointment: { service: { name: 'Root Canal Treatment' } },
        },
      ],
      error: null,
    });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new PaymentService();
    const csv = await service.exportCsv(client, {});

    expect(csv.split('\n')[0]).toBe('date,patient,service,amount,status,method');
    expect(csv).toContain('Jane Doe');
    expect(csv).toContain('Root Canal Treatment');
    expect(csv).toContain('4500');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- paymentService`
Expected: FAIL with "Cannot find module '../../src/services/PaymentService.js'"

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/services/PaymentService.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface PaymentListFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePaymentInput {
  appointmentId: string;
  patientId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  paymentDate?: string;
}

export interface UpdatePaymentInput {
  status?: string;
  paymentDate?: string;
  receiptUrl?: string;
}

const PAYMENT_SELECT = `id, amount, currency, payment_method, status, payment_date, receipt_url,
  patient:profiles!payments_patient_id_fkey(id, full_name),
  appointment:appointments(id, appointment_date, service:services(name))`;

function toCsvField(value: unknown): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** All methods take the caller's RLS-scoped client — payments RLS restricts
 * writes to is_staff() (see supabase/migrations/..._rls_policies.sql). */
export class PaymentService {
  async list(client: SupabaseClient, filters: PaymentListFilters = {}) {
    const { status, fromDate, toDate, page = 1, pageSize = 50 } = filters;

    let query = client
      .from('payments')
      .select(PAYMENT_SELECT)
      .order('payment_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('payment_date', fromDate);
    if (toDate) query = query.lte('payment_date', toDate);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return data;
  }

  async create(client: SupabaseClient, data: CreatePaymentInput) {
    const { data: row, error } = await client
      .from('payments')
      .insert({
        appointment_id: data.appointmentId,
        patient_id: data.patientId,
        amount: data.amount,
        currency: data.currency ?? 'INR',
        payment_method: data.paymentMethod,
        status: data.status ?? 'COMPLETED',
        payment_date: data.paymentDate ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !row) throw new NotFoundError(error?.message ?? 'Failed to create payment');

    return row;
  }

  async updateStatus(client: SupabaseClient, id: string, data: UpdatePaymentInput) {
    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.paymentDate) update.payment_date = data.paymentDate;
    if (data.receiptUrl) update.receipt_url = data.receiptUrl;

    const { data: row, error } = await client
      .from('payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !row) throw new NotFoundError('Payment not found');

    return row;
  }

  async exportCsv(client: SupabaseClient, filters: { fromDate?: string; toDate?: string }) {
    let query = client.from('payments').select(PAYMENT_SELECT).order('payment_date', { ascending: false });
    if (filters.fromDate) query = query.gte('payment_date', filters.fromDate);
    if (filters.toDate) query = query.lte('payment_date', filters.toDate);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    const rows = (data ?? []) as Array<{
      payment_date: string | null;
      amount: number;
      status: string;
      payment_method: string | null;
      patient: { full_name: string } | null;
      appointment: { service: { name: string } | null } | null;
    }>;

    const header = 'date,patient,service,amount,status,method';
    const lines = rows.map((row) =>
      [
        row.payment_date ?? '',
        row.patient?.full_name ?? '',
        row.appointment?.service?.name ?? '',
        row.amount,
        row.status,
        row.payment_method ?? '',
      ]
        .map(toCsvField)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- paymentService`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/services/PaymentService.ts tests/unit/paymentService.test.ts
git commit -m "feat: add PaymentService for admin payment CRUD and CSV export"
```

---

### Task 3: AdminService (dashboard stats + patient list/create)

**Files:**
- Create: `backend/src/services/AdminService.ts`
- Test: `backend/tests/unit/adminService.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient`, `NotFoundError`, `ConflictError` from `../utils/errors.js`; `supabaseAdmin` from `../lib/supabase.js`
- Produces:
  - `class AdminService`
    - `getDashboardStats(client: SupabaseClient): Promise<{ todayAppointments: number; monthRevenue: number; newPatientsThisWeek: number; pendingPayments: number }>`
    - `listPatients(client: SupabaseClient, filters: { search?: string; page?: number; pageSize?: number }): Promise<{ items: unknown[]; total: number; page: number; pageSize: number }>`
    - `createPatient(client: SupabaseClient, data: { email: string; fullName: string; phone?: string; dateOfBirth?: string; gender?: string; address?: string; city?: string }): Promise<unknown>` — uses `supabaseAdmin` internally for the `auth.users` insert and initial profile fields (documented exception, see Global Constraints)

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/unit/adminService.test.ts
import { jest } from '@jest/globals';

const createUserMock = jest.fn() as jest.Mock<any>;

function buildChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'ilike', 'or', 'order', 'range', 'update'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(result));
  (chain as any).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

jest.unstable_mockModule('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { admin: { createUser: createUserMock } },
    from: jest.fn(() => buildChain({ data: { id: 'user-1' }, error: null })),
  },
  createUserClient: jest.fn(),
}));

const { AdminService } = await import('../../src/services/AdminService.js');
const { ConflictError } = await import('../../src/utils/errors.js');

describe('AdminService.getDashboardStats', () => {
  it('aggregates counts from four queries', async () => {
    const apptChain = buildChain({ data: [{ id: 'a1' }, { id: 'a2' }], error: null });
    const paymentsChain = buildChain({
      data: [{ amount: 4500 }, { amount: 8000 }],
      error: null,
    });
    const patientsChain = buildChain({ data: [{ id: 'p1' }], error: null });
    const pendingChain = buildChain({ data: [{ id: 'pay1' }], error: null });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce(apptChain)
      .mockReturnValueOnce(paymentsChain)
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(pendingChain);
    const client = { from: fromMock } as any;

    const service = new AdminService();
    const stats = await service.getDashboardStats(client);

    expect(stats.todayAppointments).toBe(2);
    expect(stats.monthRevenue).toBe(12500);
    expect(stats.newPatientsThisWeek).toBe(1);
    expect(stats.pendingPayments).toBe(1);
  });
});

describe('AdminService.listPatients', () => {
  it('searches by name/email/phone when search is given', async () => {
    const chain = buildChain({ data: [{ id: 'p1', full_name: 'Jane Doe' }], error: null, count: 1 });
    const client = { from: jest.fn(() => chain) } as any;

    const service = new AdminService();
    const result = await service.listPatients(client, { search: 'jane' });

    expect(chain.or).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe('AdminService.createPatient', () => {
  it('throws ConflictError when auth user creation fails', async () => {
    createUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'already registered' },
    });

    const service = new AdminService();
    const client = { from: jest.fn() } as any;

    await expect(
      service.createPatient(client, { email: 'dupe@example.com', fullName: 'Dupe Patient' }),
    ).rejects.toThrow(ConflictError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- adminService`
Expected: FAIL with "Cannot find module '../../src/services/AdminService.js'"

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/services/AdminService.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface PatientListFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePatientInput {
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
}

function startOfWeek(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start of week
  now.setUTCDate(now.getUTCDate() - diff);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export class AdminService {
  async getDashboardStats(client: SupabaseClient) {
    const today = new Date().toISOString().slice(0, 10);

    const { data: todayAppts } = await client
      .from('appointments')
      .select('id')
      .eq('appointment_date', today);

    const { data: monthPayments } = await client
      .from('payments')
      .select('amount')
      .eq('status', 'COMPLETED')
      .gte('payment_date', startOfMonth());

    const { data: newPatients } = await client
      .from('profiles')
      .select('id')
      .eq('role', 'PATIENT')
      .gte('created_at', startOfWeek());

    const { data: pending } = await client.from('payments').select('id').eq('status', 'PENDING');

    const monthRevenue = ((monthPayments ?? []) as Array<{ amount: number }>).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );

    return {
      todayAppointments: (todayAppts ?? []).length,
      monthRevenue,
      newPatientsThisWeek: (newPatients ?? []).length,
      pendingPayments: (pending ?? []).length,
    };
  }

  async listPatients(client: SupabaseClient, filters: PatientListFilters = {}) {
    const { search, page = 1, pageSize = 20 } = filters;

    let query = client
      .from('profiles')
      .select('id, full_name, email, phone, created_at, patients(last_visit_date)', { count: 'exact' })
      .eq('role', 'PATIENT')
      .order('full_name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return { items: data ?? [], total: count ?? 0, page, pageSize };
  }

  /**
   * Creates the auth.users row (triggers the handle_new_user trigger, which
   * inserts a PATIENT-role profiles row) and then fills in the fields the
   * trigger doesn't set. Uses supabaseAdmin for both steps: auth.admin
   * .createUser always requires the service_role key, and profiles has no
   * staff-update RLS policy yet (only self-update) — this is the one
   * documented exception to "always use the caller's RLS-scoped client",
   * justified because it only ever touches the row this same call just
   * created.
   */
  async createPatient(client: SupabaseClient, data: CreatePatientInput) {
    const tempPassword = randomUUID();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (error || !created.user) {
      throw new ConflictError(error?.message ?? 'Could not create patient account');
    }

    const userId = created.user.id;

    await supabaseAdmin
      .from('profiles')
      .update({ phone: data.phone, date_of_birth: data.dateOfBirth, gender: data.gender })
      .eq('id', userId);

    const { error: patientError } = await client
      .from('patients')
      .upsert({ id: userId, address: data.address, city: data.city });

    if (patientError) throw new NotFoundError(patientError.message);

    const { data: profile } = await client
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', userId)
      .single();

    return profile;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- adminService`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/services/AdminService.ts tests/unit/adminService.test.ts
git commit -m "feat: add AdminService for dashboard stats and patient management"
```

---

### Task 4: Admin routes + server registration + integration test

**Files:**
- Create: `backend/src/api/routes/admin.ts`
- Modify: `backend/src/server.ts` (register the new route group)
- Test: `backend/tests/integration/admin.integration.ts`

**Interfaces:**
- Consumes: `AppointmentService` (Task 1), `PaymentService` (Task 2), `AdminService` (Task 3), `authenticate`/`authorize` from `../../middleware/auth.js`, `validate` from `../../middleware/validation.js`
- Produces: Fastify plugin `adminRoutes` registered at prefix `/api/v1/admin`

- [ ] **Step 1: Write the route file**

```typescript
// backend/src/api/routes/admin.ts
import type { FastifyInstance } from 'fastify';
import Joi from 'joi';
import { AdminService } from '../../services/AdminService.js';
import { AppointmentService } from '../../services/AppointmentService.js';
import { PaymentService } from '../../services/PaymentService.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const STAFF_ROLES = ['DENTIST', 'STAFF', 'ADMIN'] as const;

const patientListQuerySchema = Joi.object({
  search: Joi.string().max(120),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(100),
});

const createPatientSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(120).required(),
  phone: Joi.string().max(20),
  dateOfBirth: Joi.date(),
  gender: Joi.string().max(20),
  address: Joi.string().max(255),
  city: Joi.string().max(100),
});

const appointmentListQuerySchema = Joi.object({
  date: Joi.date(),
  status: Joi.string(),
});

const createAppointmentSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  staffId: Joi.string().uuid().required(),
  serviceId: Joi.string().uuid().required(),
  appointmentDate: Joi.date().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  notes: Joi.string().max(1000),
});

const updateAppointmentSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'),
  cancelledReason: Joi.string().max(255),
  appointmentDate: Joi.date(),
  startTime: Joi.string(),
  endTime: Joi.string(),
  notes: Joi.string().max(1000),
}).min(1);

const paymentListQuerySchema = Joi.object({
  status: Joi.string(),
  fromDate: Joi.date(),
  toDate: Joi.date(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(100),
});

const createPaymentSchema = Joi.object({
  appointmentId: Joi.string().uuid().required(),
  patientId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().max(10),
  paymentMethod: Joi.string().max(50),
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
  paymentDate: Joi.date(),
});

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
  paymentDate: Joi.date(),
  receiptUrl: Joi.string().uri(),
}).min(1);

const exportQuerySchema = Joi.object({
  fromDate: Joi.date(),
  toDate: Joi.date(),
});

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  const adminService = new AdminService();
  const appointmentService = new AppointmentService();
  const paymentService = new PaymentService();

  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorize([...STAFF_ROLES]));

  fastify.get('/dashboard', async (request, reply) => {
    const stats = await adminService.getDashboardStats(request.supabase!);
    reply.status(200).send(stats);
  });

  fastify.get(
    '/patients',
    { preHandler: validate(patientListQuerySchema, 'query') },
    async (request, reply) => {
      const result = await adminService.listPatients(
        request.supabase!,
        request.query as Record<string, unknown>,
      );
      reply.status(200).send(result);
    },
  );

  fastify.post(
    '/patients',
    { preHandler: validate(createPatientSchema) },
    async (request, reply) => {
      const patient = await adminService.createPatient(
        request.supabase!,
        request.body as Record<string, unknown> as never,
      );
      reply.status(201).send(patient);
    },
  );

  fastify.get(
    '/appointments',
    { preHandler: validate(appointmentListQuerySchema, 'query') },
    async (request, reply) => {
      const appointments = await appointmentService.listByDate(
        request.supabase!,
        request.query as Record<string, unknown>,
      );
      reply.status(200).send(appointments);
    },
  );

  fastify.post(
    '/appointments',
    { preHandler: validate(createAppointmentSchema) },
    async (request, reply) => {
      const appointment = await appointmentService.create(
        request.supabase!,
        request.body as never,
      );
      reply.status(201).send(appointment);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/appointments/:id',
    { preHandler: validate(updateAppointmentSchema) },
    async (request, reply) => {
      const appointment = await appointmentService.updateStatus(
        request.supabase!,
        request.params.id,
        request.body as never,
      );
      reply.status(200).send(appointment);
    },
  );

  fastify.get(
    '/payments',
    { preHandler: validate(paymentListQuerySchema, 'query') },
    async (request, reply) => {
      const payments = await paymentService.list(
        request.supabase!,
        request.query as Record<string, unknown>,
      );
      reply.status(200).send(payments);
    },
  );

  fastify.post(
    '/payments',
    { preHandler: validate(createPaymentSchema) },
    async (request, reply) => {
      const payment = await paymentService.create(request.supabase!, request.body as never);
      reply.status(201).send(payment);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/payments/:id',
    { preHandler: validate(updatePaymentSchema) },
    async (request, reply) => {
      const payment = await paymentService.updateStatus(
        request.supabase!,
        request.params.id,
        request.body as never,
      );
      reply.status(200).send(payment);
    },
  );

  fastify.get(
    '/payments/export',
    { preHandler: validate(exportQuerySchema, 'query') },
    async (request, reply) => {
      const csv = await paymentService.exportCsv(
        request.supabase!,
        request.query as Record<string, unknown>,
      );
      reply.header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename="payments.csv"');
      reply.status(200).send(csv);
    },
  );
}
```

- [ ] **Step 2: Register the route group in server.ts**

```typescript
// backend/src/server.ts — add near the other route imports
import adminRoutes from './api/routes/admin.js';
```

```typescript
// backend/src/server.ts — add alongside the other fastify.register(...Routes) calls
await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
```

- [ ] **Step 3: Write the integration test**

```typescript
// backend/tests/integration/admin.integration.ts
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

const SKIP = process.env.SKIP_INTEGRATION === '1';
const describeIf = SKIP ? describe.skip : describe;

describeIf('Admin routes (integration, needs live/local Supabase)', () => {
  let app: FastifyInstance;
  let staffToken: string;
  let patientToken: string;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    // Staff account must exist with role STAFF/ADMIN/DENTIST set via
    // supabaseAdmin.auth.admin.updateUserById / set_user_role before this
    // suite runs — see backend/README.md testing section.
    const staffLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD },
    });
    staffToken = JSON.parse(staffLogin.body).accessToken;

    const patientRegister = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `patient+${Date.now()}@gmail.com`,
        password: 'password123',
        fullName: 'Test Patient',
      },
    });
    patientToken = JSON.parse(patientRegister.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a PATIENT-role user with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns dashboard stats for a staff user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.todayAppointments).toBe('number');
    expect(typeof body.monthRevenue).toBe('number');
  });

  it('lists patients for a staff user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/patients',
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).items).toBeInstanceOf(Array);
  });

  it('exports a payments CSV for a staff user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/payments/export',
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.split('\n')[0]).toBe('date,patient,service,amount,status,method');
  });
});
```

- [ ] **Step 4: Run the unit suite to confirm nothing broke**

Run: `npm test -- --testPathIgnorePatterns=integration`
Expected: PASS (all unit tests, including Tasks 1-3)

Run the integration file only when `TEST_STAFF_EMAIL`/`TEST_STAFF_PASSWORD` are set for a real staff-role account against a live/local Supabase instance (`SKIP_INTEGRATION=1 npm test` skips it otherwise, matching the existing `auth.integration.ts` convention).

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/api/routes/admin.ts src/server.ts tests/integration/admin.integration.ts
git commit -m "feat: wire /api/v1/admin routes for dashboard, patients, appointments, payments"
```

---

### Task 5: Scaffold the `admin/` frontend app

**Files:**
- Create: `admin/package.json`
- Create: `admin/vite.config.js`
- Create: `admin/index.html`
- Create: `admin/.env.example`
- Create: `admin/.gitignore`
- Create: `admin/src/main.jsx`
- Create: `admin/src/lib/api.js`
- Create: `admin/src/lib/AuthContext.jsx`
- Create: `admin/src/index.css`

**Interfaces:**
- Produces:
  - `admin/src/lib/api.js`: `login(email, password)`, `apiFetch(path, options)` — attaches `Authorization` header, redirects to `/login` on 401
  - `admin/src/lib/AuthContext.jsx`: `AuthProvider`, `useAuth()` returning `{ user, login, logout }`

- [ ] **Step 1: package.json and Vite config**

```json
// admin/package.json
{
  "name": "kusum-dental-admin",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5175",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1"
  }
}
```

```javascript
// admin/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

```html
<!-- admin/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kusum's Dental — Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

```bash
# admin/.env.example
VITE_API_URL=http://localhost:3000/api/v1
```

```
# admin/.gitignore
node_modules
dist
.env
.env.local
```

- [ ] **Step 2: API client**

```javascript
// admin/src/lib/api.js
const API_URL = import.meta.env.VITE_API_URL;
const STORAGE_KEY = 'kusum_admin_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || 'Login failed');
  }
  return body;
}

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    setSession(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.text();
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return body;
}
```

- [ ] **Step 3: Auth context**

```jsx
// admin/src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, setSession, login as apiLogin } from './api.js';

const AuthContext = createContext(null);

const ALLOWED_ROLES = ['DENTIST', 'STAFF', 'ADMIN'];

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  useEffect(() => {
    setSession(session);
  }, [session]);

  async function login(email, password) {
    const result = await apiLogin(email, password);
    if (!ALLOWED_ROLES.includes(result.user.role)) {
      throw new Error('This account does not have dashboard access.');
    }
    setSessionState(result);
    return result;
  }

  function logout() {
    setSessionState(null);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: main.jsx and base CSS**

```jsx
// admin/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```css
/* admin/src/index.css */
:root {
  --bg: #f5f6f4;
  --surface: #ffffff;
  --border: #e2e4e0;
  --text: #1c2620;
  --text-light: #5b665f;
  --primary: #24435c;
  --danger: #b3432b;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
}

a { color: inherit; }

.container { max-width: 1080px; margin: 0 auto; padding: 24px; }

table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
th { color: var(--text-light); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }

button, .btn {
  font: inherit;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
button.secondary { background: transparent; color: var(--primary); }

input, select {
  font: inherit;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 100%;
}

.error-text { color: var(--danger); font-size: 0.85rem; }
.empty-state { color: var(--text-light); padding: 32px 0; text-align: center; }
```

- [ ] **Step 5: Install dependencies and verify the dev server boots**

Run: `cd admin && npm install && npm run dev`
Expected: Vite prints `ready` with a local URL (no `App.jsx` yet, so it will fail to render — that's expected, Task 6 adds it). Kill the dev server after confirming Vite itself starts without config errors.

- [ ] **Step 6: Commit**

```bash
git add admin/package.json admin/vite.config.js admin/index.html admin/.env.example admin/.gitignore admin/src/main.jsx admin/src/lib/api.js admin/src/lib/AuthContext.jsx admin/src/index.css
git commit -m "feat: scaffold admin/ Vite app with API client and auth context"
```

---

### Task 6: Router, auth guard, layout shell, login page

**Files:**
- Create: `admin/src/App.jsx`
- Create: `admin/src/components/ProtectedRoute.jsx`
- Create: `admin/src/components/Layout.jsx`
- Create: `admin/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 5), `react-router-dom`
- Produces: `<App />` default export wiring all routes; placeholder imports for `Dashboard`, `Patients`, `PatientNew`, `PatientDetail`, `Appointments`, `Payments` pages (created in Tasks 7-11) — this task creates minimal stub components for each so the router compiles, later tasks replace the stub file contents.

- [ ] **Step 1: Login page**

```jsx
// admin/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, paddingTop: 80 }}>
      <div className="card">
        <h1 style={{ fontSize: '1.3rem', marginTop: 0 }}>Dr. Kusum's Dental — Admin</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <div style={{ height: 12 }} />
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div style={{ height: 16 }} />
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Protected route guard**

```jsx
// admin/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
```

- [ ] **Step 3: Layout shell with nav**

```jsx
// admin/src/components/Layout.jsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <nav style={{ display: 'flex', gap: 20 }}>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
          <NavLink to="/appointments">Appointments</NavLink>
          <NavLink to="/payments">Payments</NavLink>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{user?.fullName}</span>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: App router with stub pages for Tasks 7-11**

```jsx
// admin/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientNew from './pages/PatientNew.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Appointments from './pages/Appointments.jsx';
import Payments from './pages/Payments.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/new" element={<PatientNew />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/payments" element={<Payments />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 5: Create stub pages so the app compiles (Tasks 7-11 fill these in)**

```jsx
// admin/src/pages/Dashboard.jsx
export default function Dashboard() {
  return <p>Dashboard — coming in Task 7</p>;
}
```

```jsx
// admin/src/pages/Patients.jsx
export default function Patients() {
  return <p>Patients — coming in Task 8</p>;
}
```

```jsx
// admin/src/pages/PatientNew.jsx
export default function PatientNew() {
  return <p>Add patient — coming in Task 8</p>;
}
```

```jsx
// admin/src/pages/PatientDetail.jsx
export default function PatientDetail() {
  return <p>Patient detail — coming in Task 9</p>;
}
```

```jsx
// admin/src/pages/Appointments.jsx
export default function Appointments() {
  return <p>Appointments — coming in Task 10</p>;
}
```

```jsx
// admin/src/pages/Payments.jsx
export default function Payments() {
  return <p>Payments — coming in Task 11</p>;
}
```

- [ ] **Step 6: Verify the app boots and login redirects correctly**

Run: `cd admin && npm run dev`
Open the printed URL. Expected: redirected to `/login` (no session yet). Submitting bad credentials shows the inline error. This will only succeed against a running backend (`cd backend && npm run dev` in another terminal) with a real DENTIST/STAFF/ADMIN account — see Task 12 for how to create one.

- [ ] **Step 7: Commit**

```bash
git add admin/src/App.jsx admin/src/components admin/src/pages
git commit -m "feat: add admin app router, auth guard, layout, and login page"
```

---

### Task 7: Dashboard home page

**Files:**
- Modify: `admin/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `apiFetch` from `../lib/api.js`; backend `GET /admin/dashboard` (Task 4), `GET /admin/appointments` (Task 4)

- [ ] **Step 1: Implement the dashboard page**

```jsx
// admin/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const STAT_LABELS = {
  todayAppointments: "Today's appointments",
  monthRevenue: 'This month revenue',
  newPatientsThisWeek: 'New patients this week',
  pendingPayments: 'Pending payments',
};

function formatStat(key, value) {
  if (key === 'monthRevenue') return `₹${Number(value).toLocaleString('en-IN')}`;
  return value;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiFetch('/admin/dashboard'), apiFetch('/admin/appointments')])
      .then(([statsRes, apptsRes]) => {
        setStats(statsRes);
        setAppointments(apptsRes);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(STAT_LABELS).map(([key, label]) => (
          <div className="card" key={key}>
            <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>{formatStat(key, stats[key])}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.1rem' }}>Today's appointments</h2>
      {appointments.length === 0 ? (
        <p className="empty-state">No appointments today.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{a.start_time}</td>
                <td>{a.patient?.full_name}</td>
                <td>{a.service?.name}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

With backend + admin dev servers running and logged in as a staff user, confirm the four stat tiles render numbers (not `NaN`/`undefined`) and today's appointments list shows an empty state when there's no data for today.

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Dashboard.jsx
git commit -m "feat: implement admin dashboard home with stats and today's appointments"
```

---

### Task 8: Patients list + add walk-in patient

**Files:**
- Modify: `admin/src/pages/Patients.jsx`
- Modify: `admin/src/pages/PatientNew.jsx`

**Interfaces:**
- Consumes: `apiFetch`; backend `GET /admin/patients`, `POST /admin/patients` (Task 4)

- [ ] **Step 1: Patients list with search**

```jsx
// admin/src/pages/Patients.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function Patients() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    apiFetch(`/admin/patients${query}`)
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }, [search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <input
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Link className="btn" to="/patients/new">
          + Add patient
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <p className="empty-state">No patients found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Last visit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/patients/${p.id}`}>{p.full_name}</Link>
                </td>
                <td>{p.email}</td>
                <td>{p.phone ?? '—'}</td>
                <td>{p.patients?.last_visit_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add walk-in patient form**

```jsx
// admin/src/pages/PatientNew.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

const initialForm = { email: '', fullName: '', phone: '', dateOfBirth: '', address: '', city: '' };

export default function PatientNew() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const patient = await apiFetch('/admin/patients', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: '1.2rem', marginTop: 0 }}>Add walk-in patient</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Full name
          <input value={form.fullName} onChange={update('fullName')} required />
        </label>
        <div style={{ height: 12 }} />
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <div style={{ height: 12 }} />
        <label>
          Phone
          <input value={form.phone} onChange={update('phone')} />
        </label>
        <div style={{ height: 12 }} />
        <label>
          Date of birth
          <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
        </label>
        <div style={{ height: 12 }} />
        <label>
          Address
          <input value={form.address} onChange={update('address')} />
        </label>
        <div style={{ height: 12 }} />
        <label>
          City
          <input value={form.city} onChange={update('city')} />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div style={{ height: 16 }} />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add patient'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Log in, go to Patients → Add patient, submit a new walk-in with a fresh email. Confirm redirect to the new patient's detail page (will 404/stub until Task 9) and that the patient now appears in the Patients search list.

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Patients.jsx admin/src/pages/PatientNew.jsx
git commit -m "feat: implement patients list search and add walk-in patient form"
```

---

### Task 9: Patient detail page (history + payments)

**Files:**
- Modify: `admin/src/pages/PatientDetail.jsx`

**Interfaces:**
- Consumes: `apiFetch`; backend `GET /admin/patients` (reused to find by id via filter, see note below), `GET /patients/:id/history` (existing route), `GET /admin/payments` filtered client-side by patient

Note: there is no `GET /admin/patients/:id` single-fetch endpoint in Task 4's route list — the spec's table names it, but Task 4 only wires list/create. Add the missing single-patient read here by reusing the already-existing `GET /api/v1/patients/:id` route (`backend/src/api/routes/patients.ts`, already staff-accessible via `ensureSelfOrStaff`), rather than duplicating it under `/admin`.

- [ ] **Step 1: Implement the patient detail page**

```jsx
// admin/src/pages/PatientDetail.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function PatientDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch(`/patients/${id}`),
      apiFetch(`/patients/${id}/history`),
      apiFetch('/admin/payments'),
    ])
      .then(([profileRes, historyRes, paymentsRes]) => {
        setProfile(profileRes);
        setHistory(historyRes);
        setPayments(paymentsRes.filter((p) => p.patient?.id === id));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!profile) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem' }}>{profile.full_name}</h1>
      <p style={{ color: 'var(--text-light)' }}>
        {profile.email} · {profile.phone ?? 'no phone on file'}
      </p>

      <h2 style={{ fontSize: '1.05rem', marginTop: 28 }}>Visit history</h2>
      {history.length === 0 ? (
        <p className="empty-state">No appointments yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.appointment_date}</td>
                <td>{h.status}</td>
                <td>{h.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: '1.05rem', marginTop: 28 }}>Payments</h2>
      {payments.length === 0 ? (
        <p className="empty-state">No payments recorded.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.payment_date?.slice(0, 10)}</td>
                <td>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Navigate to a patient created in Task 8. Confirm profile header, empty-state history/payments render without console errors. Record a payment for that patient (once Task 11 exists) and confirm it appears here after a refresh.

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/PatientDetail.jsx
git commit -m "feat: implement patient detail page with visit history and payments"
```

---

### Task 10: Appointments page (list, book, update status)

**Files:**
- Modify: `admin/src/pages/Appointments.jsx`

**Interfaces:**
- Consumes: `apiFetch`; backend `GET /admin/appointments`, `POST /admin/appointments`, `PATCH /admin/appointments/:id`, `GET /admin/patients`, `GET /services` (existing public route)

- [ ] **Step 1: Implement the appointments page**

```jsx
// admin/src/pages/Appointments.jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

const emptyForm = { patientId: '', serviceId: '', appointmentDate: '', startTime: '', endTime: '' };

export default function Appointments() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, appointmentDate: date });
  const [error, setError] = useState('');

  function loadAppointments() {
    apiFetch(`/admin/appointments?date=${date}`)
      .then(setAppointments)
      .catch((err) => setError(err.message));
  }

  useEffect(loadAppointments, [date]);

  useEffect(() => {
    apiFetch('/admin/patients?pageSize=100').then((res) => setPatients(res.items));
    apiFetch('/services?pageSize=100').then((res) => setServices(res.items));
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...form, staffId: user.id }),
      });
      setForm({ ...emptyForm, appointmentDate: date });
      loadAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await apiFetch(`/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
          </label>

          {error && <p className="error-text">{error}</p>}

          {appointments.length === 0 ? (
            <p className="empty-state">No appointments for this date.</p>
          ) : (
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.start_time}</td>
                    <td>{a.patient?.full_name}</td>
                    <td>{a.service?.name}</td>
                    <td>
                      <select value={a.status} onChange={(e) => handleStatusChange(a.id, e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form className="card" onSubmit={handleBook} style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Book appointment</h2>
          <label>
            Patient
            <select value={form.patientId} onChange={update('patientId')} required>
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ height: 12 }} />
          <label>
            Service
            <select value={form.serviceId} onChange={update('serviceId')} required>
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ height: 12 }} />
          <label>
            Date
            <input type="date" value={form.appointmentDate} onChange={update('appointmentDate')} required />
          </label>
          <div style={{ height: 12 }} />
          <label>
            Start time
            <input type="time" value={form.startTime} onChange={update('startTime')} required />
          </label>
          <div style={{ height: 12 }} />
          <label>
            End time
            <input type="time" value={form.endTime} onChange={update('endTime')} required />
          </label>
          <div style={{ height: 16 }} />
          <button type="submit">Book</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Book an appointment for today for a patient created in Task 8. Confirm it appears in the day list, and changing its status dropdown persists after a page refresh (re-fetches from the backend).

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Appointments.jsx
git commit -m "feat: implement appointments day view with booking and status updates"
```

---

### Task 11: Payments page (ledger, record payment, CSV export)

**Files:**
- Modify: `admin/src/pages/Payments.jsx`

**Interfaces:**
- Consumes: `apiFetch`; backend `GET /admin/payments`, `POST /admin/payments`, `PATCH /admin/payments/:id`, `GET /admin/payments/export`, `GET /admin/appointments` (to pick an appointment to bill)

- [ ] **Step 1: Implement the payments page**

```jsx
// admin/src/pages/Payments.jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ appointmentId: '', amount: '', paymentMethod: 'cash' });
  const [error, setError] = useState('');

  function loadPayments() {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    apiFetch(`/admin/payments?${params.toString()}`)
      .then(setPayments)
      .catch((err) => setError(err.message));
  }

  useEffect(loadPayments, [status, fromDate, toDate]);

  useEffect(() => {
    apiFetch('/admin/appointments').then(setAppointments).catch(() => {});
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleRecord(e) {
    e.preventDefault();
    setError('');
    const appointment = appointments.find((a) => a.id === form.appointmentId);
    if (!appointment) {
      setError('Select an appointment');
      return;
    }
    try {
      await apiFetch('/admin/payments', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: form.appointmentId,
          patientId: appointment.patient.id,
          amount: Number(form.amount),
          paymentMethod: form.paymentMethod,
        }),
      });
      setForm({ appointmentId: '', amount: '', paymentMethod: 'cash' });
      loadPayments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await apiFetch(`/admin/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadPayments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const csv = await apiFetch(`/admin/payments/export?${params.toString()}`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="secondary" onClick={handleExport} type="button">
              Export CSV
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          {payments.length === 0 ? (
            <p className="empty-state">No payments found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.payment_date?.slice(0, 10)}</td>
                    <td>{p.patient?.full_name}</td>
                    <td>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td>
                      <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form className="card" onSubmit={handleRecord} style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Record payment</h2>
          <label>
            Appointment
            <select value={form.appointmentId} onChange={update('appointmentId')} required>
              <option value="">Select appointment</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patient?.full_name} — {a.service?.name} ({a.appointment_date})
                </option>
              ))}
            </select>
          </label>
          <div style={{ height: 12 }} />
          <label>
            Amount (₹)
            <input type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} required />
          </label>
          <div style={{ height: 12 }} />
          <label>
            Method
            <select value={form.paymentMethod} onChange={update('paymentMethod')}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
          </label>
          <div style={{ height: 16 }} />
          <button type="submit">Record payment</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Record a payment against an appointment booked in Task 10. Confirm it appears in the ledger, filtering by status/date range narrows the list, and "Export CSV" downloads a file whose first line is `date,patient,service,amount,status,method`.

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Payments.jsx
git commit -m "feat: implement payments ledger with recording, filters, and CSV export"
```

---

### Task 12: End-to-end smoke test and doctor account setup

**Files:** none created — verification only.

- [ ] **Step 1: Create a real staff account and promote its role**

Register a normal account through the existing public flow, then promote it server-side (no UI for this yet — `set_user_role` is intentionally service_role-only):

```bash
cd backend
npm run dev
# in another terminal
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor+test@gmail.com","password":"password123","fullName":"Dr. Kusum"}'
```

Then promote the role using the service_role key (from `backend/.env`):

```bash
cd backend && set -a && source .env && set +a
# Get the new user's id from the register response above, then:
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/set_user_role" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id":"<the-user-id>","new_role":"ADMIN"}'
```

- [ ] **Step 2: Run the backend and admin app together**

```bash
# terminal 1
cd backend && npm run dev
# terminal 2
cd admin && npm install && npm run dev
```

- [ ] **Step 3: Manual Playwright smoke pass**

Using the `mcp__plugin_playwright_playwright__*` tools (or a browser by hand):
1. Navigate to the admin app URL, confirm redirect to `/login`.
2. Log in with `doctor+test@gmail.com` / `password123`.
3. Confirm dashboard loads with 4 stat tiles and no console errors.
4. Go to Patients → Add patient, create a walk-in with a fresh email.
5. Go to Appointments, book an appointment today for that patient.
6. Confirm it appears in the day list; change its status to `COMPLETED`.
7. Go to Payments, record a payment against that appointment.
8. Confirm the payment appears in the ledger and on the patient's detail page.
9. Confirm the dashboard's "This month revenue" stat increased after a refresh.
10. Click "Export CSV" and confirm the downloaded file contains the new payment row.
11. Log out, confirm redirect to `/login` and that a direct visit to `/` also redirects to `/login`.

- [ ] **Step 4: Run the full backend test suite**

```bash
cd backend
npm run test
```

Expected: all unit tests pass (existing + Tasks 1-3). Integration tests skip unless `TEST_STAFF_EMAIL`/`TEST_STAFF_PASSWORD` are set — run them explicitly against the account from Step 1 if you want full integration coverage:

```bash
TEST_STAFF_EMAIL=doctor+test@gmail.com TEST_STAFF_PASSWORD=password123 npm run test
```

- [ ] **Step 5: Commit any fixes found during the smoke pass**

If the manual pass surfaces a bug, fix it, re-run the affected step, then:

```bash
git add -A
git commit -m "fix: address issue found in admin dashboard smoke test"
```
