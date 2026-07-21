# Monitoring

Recommended API signals in production:

- request rate, 5xx, p95
- 401/403 rate (catch a bad deploy that breaks authz)
- DB connect failures / timeouts
- process restarts
- `/health` and `/health/ready`

## Alerts (starting points — tune them)

- 5xx > ~2% for 5 minutes
- p95 > ~1.5s for 10 minutes
- ready check failing 3 times in a row
- login failures jumping well above baseline

## If something fires

1. Which routes?
2. Last deploy?
3. Rollback if it’s not recovering ([ROLLBACK.md](ROLLBACK.md)).
4. Record what happened so the next person isn’t guessing.
