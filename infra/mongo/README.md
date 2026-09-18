# MongoDB (self-hosted)

Production and staging moved off Atlas M0 onto this VPS on **2026-09-18**. The
free tier's 512 MB quota had blocked writes, and the cluster sat ~250 ms from
the servers. One `mongod` (8.0, single-node replica set `rs0`) serves both
stacks from `/opt/duncit-mongo`, installed from `docker-compose.yml` here.

| Stack | Database | User | Roles |
| --- | --- | --- | --- |
| production | `test` (the name the old Atlas URI defaulted to) | `duncit_prod` | `readWrite` on `test` and `duncit-staging` (Data Clone writes staging) |
| staging | `duncit-staging` | `duncit_staging` | `readWrite` on `duncit-staging` |

## Layout on the host

```text
/opt/duncit-mongo/
  docker-compose.yml   copy of this folder's file
  mongo.env            MONGO_INITDB_ROOT_USERNAME/PASSWORD (root, 0600)
  keyfile              replica-set key, uid 999, 0400
  secrets/             prod|staging .pw and .uri, the Atlas-era server.env backups (0700)
  data/                the databases
  dumps/               mongodump archives (/dumps inside the container)
```

## How the servers get the URI

The deploy writes `server.env` from GitHub secrets, so the secrets are the
source of truth. Editing `server.env` alone is undone by the next deploy.

| Secret | Value |
| --- | --- |
| `MONGO_URI` | `duncit_prod` → `duncit-mongo:27017`, `replicaSet=rs0` |
| `STAGING_MONGO_URI` | `duncit_staging` → same host |
| `ATLAS_MONGO_URI` | the old Atlas cluster, frozen at the 10:51 UTC cutover |

The container joins `duncit_default` and `duncit-staging_default`, so both
servers resolve `duncit-mongo`. Start those stacks before this one.

## Connect from a laptop

There is no public port. Tunnel to the loopback-only one:

```bash
ssh -L 27017:127.0.0.1:27017 root@148.135.136.107
# then, with the user's password from secrets/<stack>.pw:
mongosh "mongodb://duncit_staging:<password>@localhost:27017/duncit-staging?authSource=admin&directConnection=true"
```

## Fresh install

```bash
mkdir -p /opt/duncit-mongo/{data,dumps,secrets} && cd /opt/duncit-mongo
openssl rand -base64 756 > keyfile && chown 999:999 keyfile && chmod 400 keyfile
printf 'MONGO_INITDB_ROOT_USERNAME=root\nMONGO_INITDB_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 24)" > mongo.env
chmod 600 mongo.env && chown -R 999:999 data dumps
docker compose up -d
# as root: rs.initiate({_id: "rs0", members: [{_id: 0, host: "duncit-mongo:27017"}]}),
# then createUser for duncit_prod / duncit_staging with the roles above.
```

`ulimits.nofile` in the compose file is required: at the host's default of 1024,
WiredTiger ran out of file handles mid-restore and `mongod` panicked.

## Backups

Tech → Database → Backups writes nightly archives to `/opt/duncit/db-backups`,
which is on this same disk. There is no off-VPS copy yet, and Atlas holds only
the cutover snapshot. Pointing back at Atlas loses every write since then.

A server move copies `/opt/duncit-mongo` (see `infra/terraform/README.md`).
