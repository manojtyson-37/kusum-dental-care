# Roadmap — Dr. Kusum's Dental Care

Tracks future work not yet done. Update as items complete or new ones come up.

## Pending / not started

- **Rotate Supabase personal access token** — a token was pasted in chat; still needs revoking at supabase.com/dashboard/account/tokens. Not stored anywhere else in the repo.
- **Rotate Vercel token** — a token was pasted in chat; still needs revoking at vercel.com/account/tokens. Not stored anywhere else in the repo.
- **Delete unused Google Places API key** — `GOOGLE_PLACES_API_KEY` removed from Vercel; the key itself still exists in Google Cloud Console credentials and should be deleted there too (was never actually used since Places API needs billing, which we routed around via SerpApi).
- **SerpApi free tier limit** — 100 searches/month; each page load calls it live only on cache miss (6h edge cache), so ~120/month max — watch usage if traffic grows, may need a paid tier or longer cache window.
- **Custom subagents not yet usable mid-session** — `.claude/agents/web-developer.md`, `ui-designer.md`, `qa-tester.md`, `business-analyst.md` created but only register on fresh Claude Code session; not yet dispatched via Agent tool.
- **In-app appointment booking** — explicitly reverted earlier (booking flow now WhatsApp-only, per user request). Real-time admin dashboard was built assuming WhatsApp-only booking + manual admin entry. If user wants online self-booking back, this is a rebuild, not a revert.
- **WhatsApp conversation tracking** (requested, declined "not now") — capturing WhatsApp booking conversations into the admin dashboard needs the WhatsApp Business Platform (Meta Cloud API), since the current `wa.me` link just opens the patient's own WhatsApp app with zero programmatic access. Needs a Meta Business account + verified number (user-side setup, can't be self-served) before any webhook/parsing work. Options discussed: (a) guided in-site form + structured WhatsApp message, buildable now without Meta API, or (b) full Business API integration. Revisit when user wants to proceed.
- **Payments/invoicing gap found during QA** — generating an invoice does not create a `payments` row; Dashboard's "Pending" amount stays ₹0 even with an outstanding invoice balance. "Record payment" is a fully separate manual step. Working as built, but may not match real clinic expectations (invoice should probably auto-create a PENDING payment). Revisit if it causes confusion in practice.
- **Payments UX gap found during QA** — "Record payment" form requires typing raw appointment/patient UUIDs by hand; the UI never surfaces these IDs anywhere (not on the appointment table, not on patient detail). Needs a patient/appointment picker instead of raw ID text fields.

## Ideas / not yet requested (parking lot)

### Patient-facing
- Online self-booking (calendar slots, confirmation, reminders) — currently WhatsApp-only, reverted earlier by request.
- Patient-facing portal (view own appointments/invoices/treatment history, pay online) — currently admin-only visibility.
- Multi-language support (Kannada/Hindi) for local reach.
- Before/after photo gallery per treatment type.
- FAQ / cost-transparency page for common searches ("RCT cost Bangalore" etc.)

### Admin/ops
- Email/SMS notifications (visit reminders, invoice receipts, follow-up nudges) — currently WhatsApp/PDF only, manual.
- Automated recurring visit-log / recall reminders (e.g., 6-month checkup nudge).
- Staff roles/permissions (dentist vs receptionist access levels).
- Bulk export of patient records / invoices for accounting handoff.

### Technical/reliability
- Error monitoring (Sentry) for production issue visibility — needs user to create a free Sentry account/project and paste the DSN.
- Image optimization/CDN for gallery photos (page-speed).

## Done (for reference, not tracked further)

- Booking flow reverted to WhatsApp `wa.me` links (no in-app scheduling).
- Hero logo silhouette (chroma-keyed transparent PNG).
- Backend hardening pass: rate limiting on auth.
- Gallery scroll section + CTABanner photo background.
- Word-trail animation reverted to arced/rainbow SVG, slowed to 60s, `slice` fix for mobile dead space.
- Full admin workflow: inquiries, visit logger/EHR, patient lookup, invoicing (PDF).
- Supabase Realtime wired into admin Dashboard/Appointments/PatientDetail.
- Automated E2E realtime test script + stored passing report.
- Google Reviews integration — live via SerpApi (Google Maps engine), no billing account needed. `api/reviews.js` fetches real rating/reviews for the clinic, 6h edge-cached, `Testimonials.jsx` renders them with fallback if API fails.
- SEO — canonical URL, OG/Twitter tags, Dentist schema.org JSON-LD (with live rating), `robots.txt`, `sitemap.xml`.
- Analytics dashboard (`/admin/analytics`) — revenue trend (6-month bar chart, zero-filled), treatment-type breakdown, no-show rate. Realtime-wired, verified against live Supabase.
- CI pipeline (`.github/workflows/ci-tests.yml`) — mocked reviews test + backend unit tests on push/PR, live realtime-flow test daily + on-demand. Needs GitHub repo secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) added by user before it can actually run.
- Rate limiting expanded to admin write routes (60/min blanket) and patient profile updates (20/5min) — was previously only on auth endpoints.
- Backup/restore tooling (`backend/scripts/backup-supabase.sh` + `BACKUP_RESTORE.md`) — needs user's Supabase DB password to actually run/verify (not something Claude has access to).
- SerpApi key rotated live (old one regenerated/revoked on their dashboard, new one set as `SERPAPI_KEY` on Vercel, redeployed) — verified zero downtime on `/api/reviews`.
- Full patient-lifecycle E2E QA (real browser, live prod, test data cleaned up after): create patient → book appointment → log visit → generate invoice → record payment, each step confirmed to propagate live across open admin tabs with no reload.
