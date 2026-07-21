# Rollback

Do this when 5xx are stuck high, valid users start getting 401/403, writes look wrong, or the UI is clearly broken after a release.

1. Tell whoever needs to know you’re rolling back.
2. Put the last good backend back.
3. Put the last good frontend back if the UI is involved.
4. Restart, check `/health` + `/health/ready`.
5. Login, open a case, touch one billing/invoice path.
6. Watch metrics for 15–30 minutes.

Prefer additive DB changes. Keep a backup (or a reverse migration) for a release window. Don’t “undo” a destructive migration blind.
