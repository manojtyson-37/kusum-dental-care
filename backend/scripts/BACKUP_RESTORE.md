# Backup & restore drill

## Taking a backup

```
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD=<db password> ./backend/scripts/backup-supabase.sh
```

Writes a full schema+data dump to `backend/backups/backup-<timestamp>.sql` (gitignored —
these are production data and never belong in the repo). Store the file somewhere
durable (encrypted local disk, a private cloud bucket) outside the repo.

Run this before risky migrations, and periodically (monthly is reasonable for a
clinic-scale dataset) as a standing precaution.

## Restore drill — verifying a backup is actually usable

A backup you've never restored is a guess, not a backup. Test it against a
**local** Supabase instance, never against production:

1. Start a local stack: `npx supabase start` (spins up local Postgres + API on
   Docker; first run pulls images, takes a few minutes).
2. Restore the dump into it:
   ```
   psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2)" -f backend/backups/backup-<timestamp>.sql
   ```
3. Verify table row counts roughly match what you expect (compare against the
   admin dashboard's stat tiles from around the backup's timestamp, or query
   directly):
   ```
   psql "<local db url>" -c "select count(*) from patients;"
   psql "<local db url>" -c "select count(*) from appointments;"
   ```
4. Spot-check a real row (e.g. a known patient's profile) renders correctly.
5. Tear down: `npx supabase stop`.

## Real recovery (only if production data is actually lost/corrupted)

This is destructive and should only be run with explicit confirmation, against
a real incident:

```
psql "<production db connection string>" -f backend/backups/backup-<timestamp>.sql
```

Prefer restoring into a **new** empty database and cutting over, rather than
restoring on top of a live database with existing (possibly conflicting) rows.
