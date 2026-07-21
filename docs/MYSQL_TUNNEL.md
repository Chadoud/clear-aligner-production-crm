# MySQL over SSH tunnel

Most managed hosting doesn’t expose MySQL to the internet. For local work we tunnel it over SSH.

Script: [`scripts/mysql-tunnel.sh`](../scripts/mysql-tunnel.sh). It reads the project `.env` if present, otherwise env vars.

## Env vars

- `SSH_USER` — SSH login from the hosting panel (required)
- `SSH_HOST` — SSH hostname (required)
- `REMOTE_HOST` — MySQL host as seen from the SSH box (required)
- `LOCAL_PORT` — default `3307`
- `REMOTE_PORT` — default `3306`

Get SSH details from your hosting provider's control panel (FTP / SSH section). Don’t put passwords in this file or in git.

## Tunnel

```bash
export SSH_USER=…
export SSH_HOST=…
export REMOTE_HOST=…
bash scripts/mysql-tunnel.sh
```

Leave it running. Ctrl+C closes it.

Optional `~/.ssh/config`:

```
Host lab-crm-tunnel
  HostName YOUR_SSH_HOST
  User YOUR_SSH_USER
  IdentityFile ~/.ssh/id_rsa
```

## App

Point `backend/.env` at the tunnel, e.g.

```
SOURCE_DB_URL=mysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/DB_NAME
```

Then `npm run dev:backend` and `npm run dev` (or `npm run dev:all`).

Sanity check: `mysql -h 127.0.0.1 -P 3307 -u … -p … -e "SELECT 1;"` with credentials from your password manager — not from docs.

On the VPS in production you usually skip the tunnel and set `SOURCE_DB_URL` straight at MySQL. See [DEPLOYMENT.md](DEPLOYMENT.md).
