# PostgreSQL Backup & Restore

Automated backups are produced by [`scripts/backup.sh`](../scripts/backup.sh) using
`pg_dump` in custom format (`-Fc`), which supports selective restore via `pg_restore`.

## Configuration

All settings are read from environment variables (see `.env.example`):

| Variable         | Default              | Description                                  |
| ---------------- | -------------------- | -------------------------------------------- |
| `PGHOST`         | `localhost`          | Database host                                |
| `PGPORT`         | `5432`               | Database port                                |
| `PGUSER`         | `postgres`           | Database user                                |
| `PGPASSWORD`     | _(unset)_            | Database password                            |
| `PGDATABASE`     | `soroban_explorer`   | Database name                                |
| `BACKUP_DIR`     | `./backups`          | Directory where dumps are written            |
| `RETENTION_DAYS` | `7`                  | Delete dumps older than this many days       |

If `DATABASE_URL` is set, the individual `PG*` variables are derived from it when
not explicitly provided.

## Running a backup

```bash
./scripts/backup.sh
```

The script writes `${BACKUP_DIR}/${PGDATABASE}_<UTC-timestamp>.dump`, verifies the
dump is larger than 512 bytes, and prunes dumps older than `RETENTION_DAYS`.

## Cron job

Schedule a daily backup at 02:00:

```cron
0 2 * * * cd /path/to/repo && ./scripts/backup.sh >> /var/log/pg-backup.log 2>&1
```

## Restore procedure

1. Stop the indexer/API so no writes occur during restore.
2. Create a fresh database (or drop and recreate the existing one):

   ```bash
   createdb -h "$PGHOST" -U "$PGUSER" soroban_explorer
   ```

3. Restore the dump with `pg_restore`:

   ```bash
   pg_restore -h "$PGHOST" -U "$PGUSER" -d soroban_explorer --clean --if-exists \
     ./backups/soroban_explorer_20240101T020000Z.dump
   ```

4. Verify the restore:

   ```bash
   psql -h "$PGHOST" -U "$PGUSER" -d soroban_explorer -c '\dt'
   ```

5. Restart the indexer/API.

## Cloud backup options

Managed providers offer built-in backups; combine them with `scripts/backup.sh`
for off-site copies.

- **AWS RDS** — automated snapshots with point-in-time recovery. Configure the
  retention window in the RDS console or via `BackupRetentionPeriod`.
- **Google Cloud SQL** — automated backups and point-in-time recovery; enable
  under *Backups* in the instance settings.
- **Supabase** — daily backups on paid plans; use `pg_dump` against the connection
  string for self-managed copies.
- **Neon** — branching plus point-in-time restore; use `pg_dump` for portable dumps.

For any provider, point `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` (or
`DATABASE_URL`) at the managed instance and run `scripts/backup.sh` on a schedule.
