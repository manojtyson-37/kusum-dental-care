import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import Joi from 'joi';
import { AdminService } from '../../services/AdminService.js';
import { AppointmentService } from '../../services/AppointmentService.js';
import { PaymentService } from '../../services/PaymentService.js';
import { InquiryService } from '../../services/InquiryService.js';
import { VisitService } from '../../services/VisitService.js';
import { PatientRecordService } from '../../services/PatientRecordService.js';
import { FileService } from '../../services/FileService.js';
import { InvoiceService } from '../../services/InvoiceService.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, authorize, requireDoctor } from '../../middleware/auth.js';
import { ValidationError } from '../../utils/errors.js';

const STAFF_ROLES = ['DENTIST', 'STAFF', 'ADMIN'] as const;

const patientListQuerySchema = Joi.object({
  search: Joi.string().max(120),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(100),
});

const createPatientSchema = Joi.object({
  email: Joi.string().email().allow('').optional(),
  fullName: Joi.string().min(2).max(120).required(),
  phone: Joi.string().max(20),
  dateOfBirth: Joi.date().raw(),
  gender: Joi.string().max(20),
  address: Joi.string().max(255),
  city: Joi.string().max(100),
});

const appointmentListQuerySchema = Joi.object({
  date: Joi.date().raw(),
  status: Joi.string(),
});

const createAppointmentSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  staffId: Joi.string().uuid().required(),
  serviceId: Joi.string().uuid().required(),
  appointmentDate: Joi.date().raw().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  notes: Joi.string().max(1000).allow('').optional(),
});

const updateAppointmentSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'),
  cancelledReason: Joi.string().max(255).allow(''),
  appointmentDate: Joi.date().raw(),
  startTime: Joi.string(),
  endTime: Joi.string(),
  notes: Joi.string().max(1000).allow(''),
  staffId: Joi.string().uuid(),
  serviceId: Joi.string().uuid(),
}).min(1);

const paymentListQuerySchema = Joi.object({
  status: Joi.string(),
  fromDate: Joi.date().raw(),
  toDate: Joi.date().raw(),
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
  paymentDate: Joi.date().raw(),
});

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
  paymentDate: Joi.date().raw(),
  receiptUrl: Joi.string().uri(),
}).min(1);

const exportQuerySchema = Joi.object({
  fromDate: Joi.date().raw(),
  toDate: Joi.date().raw(),
});

const inquiryListQuerySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONTACTED', 'CONFIRMED', 'ARCHIVED'),
});

const updateInquirySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONTACTED', 'CONFIRMED', 'ARCHIVED').required(),
});

const logVisitSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  treatment: Joi.string().min(2).max(200).required(),
  clinicalNotes: Joi.string().max(2000),
  prescription: Joi.string().max(2000),
  followUpDate: Joi.date().raw(),
  amountCharged: Joi.number().positive(),
  visitDate: Joi.date().raw(),
});

const patientSearchQuerySchema = Joi.object({
  search: Joi.string().min(2).max(60).required(),
});

const createInvoiceSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  visitId: Joi.string().uuid(),
  items: Joi.array()
    .items(
      Joi.object({
        description: Joi.string().min(1).max(200).required(),
        amount: Joi.number().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  const adminService = new AdminService();
  const appointmentService = new AppointmentService();
  const paymentService = new PaymentService();
  const inquiryService = new InquiryService();
  const visitService = new VisitService();
  const patientRecordService = new PatientRecordService();
  const fileService = new FileService();
  const invoiceService = new InvoiceService();

  await fastify.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorize([...STAFF_ROLES]));
  fastify.addHook('preHandler', requireDoctor);

  // Defense-in-depth against a leaked/compromised staff token or a buggy
  // client hammering writes — reads stay unlimited, mutating routes get a
  // shared default unless a route sets its own rateLimit config.
  fastify.addHook('onRoute', (routeOptions) => {
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
    if (methods.some((m) => mutatingMethods.includes(m)) && !routeOptions.config?.rateLimit) {
      routeOptions.config = { ...routeOptions.config, rateLimit: { max: 60, timeWindow: '1 minute' } };
    }
  });

  fastify.get('/dashboard', async (request, reply) => {
    const stats = await adminService.getDashboardStats(request.supabase!);
    reply.status(200).send(stats);
  });

  fastify.get('/analytics', async (request, reply) => {
    const analytics = await adminService.getAnalytics(request.supabase!);
    reply.status(200).send(analytics);
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

  fastify.get<{ Params: { id: string } }>('/patients/:id', async (request, reply) => {
    const patient = await adminService.getPatient(request.supabase!, request.params.id);
    reply.status(200).send(patient);
  });

  fastify.get('/staff', async (request, reply) => {
    const staff = await adminService.listStaff(request.supabase!);
    reply.status(200).send(staff);
  });

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
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="payments.csv"');
      reply.status(200).send(csv);
    },
  );

  // -------------------------------------------------------------------
  // Booking inquiries (lead capture) — admin side of /api/v1/inquiries
  // -------------------------------------------------------------------
  fastify.get(
    '/inquiries',
    { preHandler: validate(inquiryListQuerySchema, 'query') },
    async (request, reply) => {
      const inquiries = await inquiryService.list(
        request.supabase!,
        request.query as Record<string, unknown>,
      );
      reply.status(200).send(inquiries);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/inquiries/:id',
    { preHandler: validate(updateInquirySchema) },
    async (request, reply) => {
      const { status } = request.body as { status: string };
      const inquiry = await inquiryService.updateStatus(request.supabase!, request.params.id, status);
      reply.status(200).send(inquiry);
    },
  );

  // -------------------------------------------------------------------
  // Fast visit logger / EHR
  // -------------------------------------------------------------------
  fastify.post('/visits', { preHandler: validate(logVisitSchema) }, async (request, reply) => {
    const body = request.body as Omit<Parameters<typeof visitService.logVisit>[0], 'loggedBy'>;
    const visit = await visitService.logVisit({ ...body, loggedBy: request.user!.id });
    reply.status(201).send(visit);
  });

  fastify.get<{ Params: { id: string } }>('/patients/:id/visits', async (request, reply) => {
    const visits = await visitService.listForPatient(request.params.id);
    reply.status(200).send(visits);
  });

  // -------------------------------------------------------------------
  // Instant patient lookup — name/phone autocomplete + full record
  // -------------------------------------------------------------------
  fastify.get(
    '/patients/search',
    { preHandler: validate(patientSearchQuerySchema, 'query') },
    async (request, reply) => {
      const { search } = request.query as { search: string };
      const results = await patientRecordService.search(search);
      reply.status(200).send(results);
    },
  );

  fastify.get<{ Params: { id: string } }>('/patients/:id/record', async (request, reply) => {
    const record = await patientRecordService.getFullRecord(request.params.id);
    reply.status(200).send(record);
  });

  // -------------------------------------------------------------------
  // Patient files (X-rays and other attachments)
  // -------------------------------------------------------------------
  fastify.get<{ Params: { id: string } }>('/patients/:id/files', async (request, reply) => {
    const files = await fileService.listForPatient(request.params.id);
    reply.status(200).send(files);
  });

  fastify.post<{ Params: { id: string } }>('/patients/:id/files', async (request, reply) => {
    const uploaded = await request.file();
    if (!uploaded) throw new ValidationError('No file provided', ['file']);

    const buffer = await uploaded.toBuffer();
    const file = await fileService.upload({
      patientId: request.params.id,
      uploadedBy: request.user!.id,
      fileName: uploaded.filename,
      mimeType: uploaded.mimetype,
      buffer,
    });
    reply.status(201).send(file);
  });

  // -------------------------------------------------------------------
  // 1-click invoice / receipt generation
  // -------------------------------------------------------------------
  fastify.post('/invoices', { preHandler: validate(createInvoiceSchema) }, async (request, reply) => {
    const body = request.body as Omit<Parameters<typeof invoiceService.create>[0], 'createdBy'>;
    const invoice = await invoiceService.create({ ...body, createdBy: request.user!.id });
    reply.status(201).send(invoice);
  });

  fastify.get<{ Params: { id: string } }>('/patients/:id/invoices', async (request, reply) => {
    const invoices = await invoiceService.listForPatient(request.params.id);
    reply.status(200).send(invoices);
  });

  fastify.patch<{ Params: { id: string } }>('/invoices/:id/paid', async (request, reply) => {
    const invoice = await invoiceService.markPaid(request.params.id);
    reply.status(200).send(invoice);
  });
}
