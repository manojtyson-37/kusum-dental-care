# IDE/AI Assistant Prompt: Build Kusum's Dental Backend

## Copy & Paste This Prompt Into Your IDE's AI Assistant

---

> **Note (2026-08-28): superseded by Supabase.** Phase 1 below was built,
> then migrated off self-hosted Postgres/Redis/Knex/JWT/bcryptjs onto
> **Supabase** (hosted Postgres + Auth + RLS) — a deliberate full swap, not
> a partial one. See `backend/PROGRESS.md` for exactly what changed and
> `backend/README.md` for the current setup. The task list below is kept
> for historical/reference value; **treat the stack section as outdated**
> and read it as: Supabase Auth instead of JWT+bcryptjs, `supabase-js` +
> Postgres RLS instead of Knex+app-level authorization, no Redis/Bull yet
> (deferred to Phase 2). Schema, RLS policies, and the auth trigger now
> live in `supabase/migrations/` at the repo root, not
> `backend/src/database/`.
>
> **Current phase: admin dashboard** (doctor login + patient/appointment/
> payment tracking). Design spec:
> `docs/superpowers/specs/2026-08-28-admin-dashboard-design.md`.

```
PROJECT: Production-Ready Dental Clinic Management Backend

TECH STACK (as originally planned — see note above for what's actually running):
- Runtime: Node.js 20 LTS
- Framework: Fastify (not Express)
- Language: TypeScript (strict mode)
- Database: PostgreSQL 15
- Cache: Redis 7
- Real-time: Socket.io
- Job Queue: Bull
- Auth: JWT + bcryptjs
- Payments: Stripe/Razorpay
- Email: SendGrid
- SMS: Twilio
- File Storage: AWS S3
- Deployment: Docker + Kubernetes

ACTUAL CURRENT STACK (post-Supabase migration):
- Runtime: Node.js 20 · Framework: Fastify · TypeScript (strict)
- Database + Auth + Authorization: Supabase (Postgres + Auth + Row Level
  Security) via @supabase/supabase-js — no custom AuthService crypto, no
  JWT signing/verification in app code, no Knex
- Real-time: Socket.io (Phase 2, not yet wired)
- Job Queue: none yet (Bull deferred to Phase 2)
- Payments/Email/SMS/File Storage: not yet integrated (deferred)
- Deployment: Docker (Kubernetes not yet set up)

PROJECT REQUIREMENTS:
1. HIPAA-compliant healthcare system
2. Real-time appointment availability updates
3. Production-ready with 99.9% uptime target
4. Support for concurrent users (1000+)
5. Fully tested (80%+ code coverage)
6. Comprehensive error handling & logging

ARCHITECTURE PATTERN:
- Layered architecture: Controller → Service → Repository → Database
- Real-time via Socket.io + Redis Pub/Sub
- Async jobs via Bull queue for notifications
- Row-level security in PostgreSQL
- Audit logging for HIPAA compliance

PHASE 1 TASKS (Weeks 1-4):
Build the foundation layer - everything else depends on this being solid.

1. PROJECT SETUP
   - Initialize Node.js project with TypeScript
   - Install: fastify, fastify-cors, fastify-jwt, helmet, joi
   - Install: pg, knex, redis, bull, winston, @types/node, jest, supertest
   - Create folder structure: src/{database,api/routes,services,middleware,websocket,queues,utils}
   - Set up Docker & docker-compose.yml with PostgreSQL + Redis
   - Create .env file with all required keys
   - Initialize ESLint, Prettier, tsconfig.json
   - Create GitHub repository

2. DATABASE SETUP (Knex.js Migrations)
   Create migrations for these tables:
   
   a) users table
      - id (UUID PK)
      - email (VARCHAR UNIQUE)
      - password_hash (VARCHAR)
      - phone, full_name, date_of_birth, gender
      - role (ENUM: PATIENT|DENTIST|STAFF|ADMIN)
      - profile_photo_url, medical_history (JSONB), allergies (TEXT[])
      - is_active (BOOLEAN)
      - created_at, updated_at, deleted_at (soft delete)
      - Indexes: email, role
   
   b) patients table (extends users)
      - id (UUID FK → users.id)
      - address, city, state, postal_code
      - insurance_provider, insurance_id
      - emergency_contact_name, emergency_contact_phone
      - last_visit_date
   
   c) services table
      - id (UUID PK)
      - name, description, category (ENUM), base_price, duration_minutes
      - is_active, complexity_level
   
   d) appointments table
      - id (UUID PK)
      - patient_id, staff_id, service_id (all UUIDs)
      - appointment_date, start_time, end_time
      - status (ENUM: SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW)
      - notes, reminder_sent, cancelled_reason
      - created_at, updated_at
      - Indexes: (patient_id, appointment_date), (staff_id, appointment_date), status
   
   e) appointment_slots table
      - id (UUID PK)
      - staff_id, date, start_time, end_time
      - is_available (BOOLEAN)
      - service_id (optional - null = all services)
   
   f) payments table
      - id (UUID PK)
      - appointment_id, patient_id
      - amount (DECIMAL), currency
      - payment_method, gateway_transaction_id
      - status (ENUM: PENDING|COMPLETED|FAILED|REFUNDED)
      - payment_date, receipt_url
   
   g) reviews table
      - id (UUID PK)
      - patient_id, staff_id, appointment_id
      - rating (INT 1-5), title, comment
      - is_verified_patient, is_approved
      - created_at, updated_at
   
   h) audit_logs table (HIPAA required)
      - id (UUID PK)
      - user_id, entity_type, entity_id
      - action (ENUM: CREATE|READ|UPDATE|DELETE)
      - old_values (JSONB), new_values (JSONB)
      - ip_address, user_agent, timestamp
      - Index: (user_id, timestamp)
   
   i) notification_queue table
      - id (UUID PK)
      - recipient_id, type (ENUM: EMAIL|SMS|IN_APP)
      - title, message, is_sent, sent_at, created_at
   
   j) contact_inquiries table
      - id (UUID PK)
      - name, email, phone, subject, message
      - status (ENUM: NEW|RESPONDED|CLOSED)
      - created_at, responded_at
   
   k) otps table
      - id (UUID PK)
      - user_id, code, purpose, expires_at, is_used, created_at

3. AUTHENTICATION SYSTEM
   
   File: src/services/AuthService.ts
   - register(email, password, fullName, role) → creates user, returns JWT
   - login(email, password) → validates, returns accessToken + refreshToken
   - verifyToken(token) → validates JWT
   - refreshToken(token) → issues new accessToken
   - Password hashing with bcryptjs (salt rounds: 10)
   
   File: src/middleware/auth.ts
   - authenticate middleware: checks JWT validity
   - authorize(roles[]) middleware: checks user role
   - Extract user from JWT payload
   
   File: src/api/routes/auth.ts
   Routes:
   - POST /api/v1/auth/register
     Input: {email, password, fullName}
     Output: {user, accessToken, refreshToken}
     Status: 201 on success, 400 on validation error
   
   - POST /api/v1/auth/login
     Input: {email, password}
     Output: {user, accessToken, refreshToken}
     Status: 200 on success, 401 on invalid credentials
   
   - POST /api/v1/auth/refresh-token
     Input: {refreshToken}
     Output: {accessToken}
     Status: 200 on success, 401 on invalid token
   
   - POST /api/v1/auth/logout
     Invalidate token in Redis
     Status: 200

4. CORE API STRUCTURE
   
   File: src/server.ts (Main entry point)
   - Initialize Fastify
   - Register plugins: helmet, cors, jwt, socket.io
   - Register route handlers
   - Start server on port 3000
   - WebSocket on port 3001
   - Graceful shutdown
   
   File: src/middleware/errorHandler.ts
   - Catch all errors
   - Log errors with Winston
   - Return appropriate HTTP status codes
   - Never expose stack traces in production
   
   File: src/middleware/validation.ts
   - Validate all inputs with Joi
   - Sanitize strings
   - Check data types
   - Return 400 with detailed error messages
   
   File: src/middleware/logging.ts
   - Log all requests: method, path, status, duration
   - Use Winston for structured logging
   - Include request ID for tracing
   
   File: src/middleware/audit.ts
   - Log all data modifications (POST, PUT, DELETE)
   - Include user ID, IP, timestamp, action, data changes
   - Store in audit_logs table
   - Never log passwords or sensitive data

5. PATIENT PROFILE ENDPOINTS
   
   File: src/services/PatientService.ts
   - getProfile(patientId) → retrieves patient data
   - updateProfile(patientId, data) → updates patient details
   - getAppointmentHistory(patientId, filters) → lists past appointments
   - getMedicalRecords(patientId) → retrieves medical history
   
   File: src/api/routes/patients.ts
   Routes:
   - GET /api/v1/patients/me (current user's profile)
   - GET /api/v1/patients/:id (public profile)
   - PUT /api/v1/patients/:id (update own profile)
   - GET /api/v1/patients/:id/history (appointment history)
   - GET /api/v1/patients/:id/records (medical records)
   - PUT /api/v1/patients/:id/preferences (notification settings)

6. SERVICE/TREATMENT ENDPOINTS
   
   File: src/services/ServiceService.ts
   - listServices(filters) → returns all services with pricing
   - getService(serviceId) → returns service details
   - getServicesByCategory(category) → filters by category
   
   File: src/api/routes/services.ts
   Routes:
   - GET /api/v1/services (list all with pagination)
   - GET /api/v1/services/:id (get details)
   - GET /api/v1/services/category/:category (filter by category)

7. ERROR HANDLING & LOGGING
   
   File: src/utils/logger.ts
   - Use Winston for structured logging
   - Levels: error, warn, info, debug
   - Transport: console + file
   - Include timestamps, request IDs
   
   File: src/utils/errors.ts
   - Custom error classes: AppError, ValidationError, NotFoundError, UnauthorizedError
   - All errors include status code + message
   - Never leak sensitive info

8. API DOCUMENTATION (Swagger)
   
   File: src/utils/swagger.ts
   - Auto-generate OpenAPI docs from route definitions
   - Include request/response schemas
   - Add authentication examples
   - Serve on /api/docs
   
   Add JSDoc comments to all routes:
   ```
   /**
    * @post /api/v1/auth/login
    * @description User login with email and password
    * @param {string} email - User email
    * @param {string} password - User password
    * @returns {object} 200 - {user, accessToken, refreshToken}
    * @returns {object} 401 - {error: "Invalid credentials"}
    */
   ```

9. DATABASE CONNECTION
   
   File: src/database/connection.ts
   - Initialize PostgreSQL connection pool
   - Set connection pooling: min 2, max 10 connections
   - Handle connection errors
   - Test connection on startup
   
   File: src/database/knexfile.js
   - Configure for development/staging/production
   - Set proper migrations folder
   - Enable logging in development

10. TESTING SETUP (Jest + Supertest)
    
    File: jest.config.js
    - Configure TypeScript support
    - Set up test environment
    - Configure coverage thresholds: 80%
    
    File: tests/unit/auth.test.ts
    - Test register: valid input, duplicate email, invalid password
    - Test login: valid credentials, invalid password, user not found
    - Test token refresh: valid token, expired token
    
    File: tests/integration/auth.integration.ts
    - Test full registration → login flow
    - Test user can access protected endpoints
    - Test user cannot access other users' data
    
    Run tests:
    npm run test
    npm run test:coverage
    Target: 80%+ coverage

11. DEPLOYMENT SETUP
    
    File: Dockerfile
    - Use node:20-alpine
    - Multi-stage build (build → runtime)
    - Expose ports 3000, 3001
    - Health check endpoint
    
    File: docker-compose.yml
    - backend service (Fastify)
    - postgres service (PostgreSQL 15)
    - redis service (Redis 7)
    - Volume management
    - Network configuration
    
    Test:
    docker-compose up
    curl http://localhost:3000/health

12. ENVIRONMENT & SECRETS
    
    File: .env (never commit)
    ```
    DATABASE_URL=postgresql://user:pass@localhost:5432/dental_db
    REDIS_URL=redis://localhost:6379
    JWT_SECRET=your-secret-key-here
    JWT_EXPIRY=15m
    JWT_REFRESH_EXPIRY=7d
    NODE_ENV=development
    PORT=3000
    WS_PORT=3001
    LOG_LEVEL=debug
    ```
    
    File: .env.example (commit this)
    ```
    DATABASE_URL=postgresql://user:pass@localhost:5432/dental_db
    REDIS_URL=redis://localhost:6379
    JWT_SECRET=change-this-in-production
    ...
    ```
    
    Never hardcode secrets. Use environment variables only.

TESTING REQUIREMENTS:
- Unit tests for all services
- Integration tests for API endpoints
- Auth flow tests
- Error handling tests
- Input validation tests
- Target: 80%+ code coverage
- Run: npm run test

CODE QUALITY:
- TypeScript strict mode enabled
- ESLint configured (airbnb rules)
- Prettier formatting applied
- No console.log (use logger instead)
- No commented code
- Clear variable/function names
- JSDoc comments for public APIs

SECURITY CHECKLIST:
✅ No passwords in logs
✅ Password hashed with bcryptjs
✅ JWT tokens validated
✅ Input sanitized with Joi
✅ SQL injection prevented (parameterized queries)
✅ CORS configured
✅ Helmet.js for security headers
✅ No sensitive data in error messages
✅ Rate limiting placeholder (implement in Phase 2)
✅ Audit logging for all data changes

DELIVERABLES FOR PHASE 1:
1. Working Node.js + Fastify server
2. PostgreSQL database with all tables
3. User authentication (register, login, refresh)
4. Patient profile endpoints
5. Service listing endpoints
6. Comprehensive error handling
7. API documentation (Swagger)
8. Unit & integration tests (80%+ coverage)
9. Docker setup (development)
10. GitHub repository with CI/CD basics
11. Logging with Winston
12. README with setup instructions

SUCCESS CRITERIA FOR PHASE 1:
- Server starts without errors: npm run dev
- All tests pass: npm run test
- API docs available: http://localhost:3000/docs
- Can register new user: POST /api/v1/auth/register
- Can login: POST /api/v1/auth/login
- Can access protected routes with JWT
- Database migrations run successfully
- Docker environment works: docker-compose up
- 80%+ code coverage on all services
- No security warnings in code review

CURRENT PHASE: PHASE 1 — DONE (migrated to Supabase, see backend/PROGRESS.md)

NEXT PHASE: Admin Dashboard (doctor/staff login + patient, appointment,
and payment tracking). Full design in
docs/superpowers/specs/2026-08-28-admin-dashboard-design.md:
- New backend route group /api/v1/admin/* (dashboard stats, patients
  list/create, appointments CRUD, payments CRUD + CSV export), gated by
  Supabase Auth + role check (DENTIST/STAFF/ADMIN)
- New AppointmentService.ts and PaymentService.ts (don't exist yet)
- Separate admin/ Vite+React app (own login, own deploy) — not routes
  bolted onto the public marketing site

AFTER THAT:
- Real-time appointment availability (Socket.io + Supabase Realtime)
- Payments gateway integration (Stripe/Razorpay) wired to the payments
  table the admin dashboard already tracks
- Notification queue wiring (table exists, unused) — email/SMS reminders
- Security hardening + HIPAA compliance pass
- DevOps: CI/CD, Kubernetes (if needed at that scale)

IMPORTANT NOTES:
1. Fastify is used instead of Express for performance (30K req/sec)
2. TypeScript is mandatory for type safety in healthcare
3. All async operations must handle errors properly
4. Never skip testing - 80%+ coverage required
5. Security is non-negotiable - validate EVERYTHING
6. Use parameterized queries ALWAYS (prevent SQL injection)
7. Audit log all data modifications (HIPAA requirement)
8. Never commit .env file or secrets
9. Use proper HTTP status codes (201 for create, 400 for validation, 401 for auth, 403 for permission, 500 for server error)
10. Database connections should be pooled and properly closed

START NOW:
1. Create folder: mkdir kusum-dental-backend && cd kusum-dental-backend
2. Initialize: npm init -y
3. Follow the 12 tasks above in order
4. Reference the architecture docs for design patterns
5. Test after each task
6. Commit to Git regularly

NEED HELP WITH:
- Specific task implementation? Ask with task number (e.g., "Help with Task 3")
- Code review? Share the file with task number
- Error debugging? Share error message + task number
- Architecture question? Ask about specific component
```

---

## How to Use This Prompt

### Option 1: GitHub Copilot in VSCode
1. Open Command Palette (Cmd+Shift+P)
2. Select "GitHub Copilot: New Chat"
3. Paste the prompt above
4. Copilot will help you build each task

### Option 2: Claude (This Interface)
1. Paste the prompt in any new conversation
2. Ask for help with specific phases
3. Example: "Help me with Task 3: Authentication System"

### Option 3: ChatGPT/Other AI
1. Paste the full prompt
2. Ask to help implement each phase
3. Ask for code reviews

### Option 4: As a Comment in Your IDE
```typescript
/*
 * KUSUM'S DENTAL BACKEND - PHASE 1
 * 
 * Copy & paste the prompt above for AI assistance
 * Reference specific tasks by number
 * Example: "Implement Task 3 based on the prompt"
 */
```

---

## Progressive Requests (Use After Pasting Main Prompt)

Once you've pasted the main prompt, use these follow-up requests:

### For Specific Task Help:
```
Based on the project prompt, help me with Task [NUMBER]: [TASK NAME]
Requirements: [Copy relevant requirements from above]
Current blocker: [Describe your issue]
```

### For Code Review:
```
Review this code against Task [NUMBER] requirements:
[Paste code]

Does it meet all requirements? Any security concerns? Any improvements?
```

### For Debugging:
```
I'm getting this error in Task [NUMBER]:
[Paste error message]

Code context:
[Paste relevant code]

What's wrong? How do I fix it?
```

### For Architecture Clarification:
```
Question about Task [NUMBER]: [YOUR QUESTION]

Based on the architecture:
- What's the right approach?
- Should I use [OPTION A] or [OPTION B]?
- How does this fit with the overall design?
```

---

## Tips for Best Results

1. **Paste the full prompt first** - This gives context
2. **Reference by task number** - "Help with Task 3" is clearer
3. **Share error messages** - AI needs details to help
4. **Ask for code patterns** - "Show me the pattern for [THING]"
5. **Request reviews** - "Review my implementation of Task X"
6. **Test as you go** - Don't move to next task if current fails
7. **Commit regularly** - Git history helps if issues occur

---

## Example Conversation Flow

```
You: [Paste full prompt above]

AI: I've reviewed your Kusum's Dental Backend project. This is a 
    comprehensive HIPAA-compliant system. Phase 1 focuses on 
    foundation. Ready to help you build it.

You: Help me with Task 1: PROJECT SETUP

AI: [Provides step-by-step guide for project initialization]

You: I completed Task 1. Now help with Task 2: DATABASE SETUP

AI: [Provides Knex migration templates and examples]

You: Here's my auth.ts file. Review it against Task 3 requirements.
     [Paste code]

AI: [Provides feedback and improvements]

You: I'm getting an error in the database connection. Help!
     Error: [Share error]
     Code: [Share relevant code]

AI: [Debugs and fixes the issue]
```

---

Ready to start? Paste the main prompt above into your IDE's AI assistant and begin with Task 1! 🚀
