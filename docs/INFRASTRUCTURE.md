# Infrastructure — Kanban Dev Flow

Serviços que o app depende, além do binário Go.

| Name | Image | Local Port | Env Var | Type |
|------|-------|-----------|---------|------|
| db | supabase/postgres:17.6.1.171 | 5432 | DATABASE_URL | backend |

O container local **precisa** usar essa mesma imagem (`<repo>-db`), e não
`postgres:alpine`: é ela que traz as extensões do padrão Cofounder (pgmq,
pg_cron, pgroonga, pgvector, pg_jsonschema, PostGIS) e é a que roda em
produção.

## Deploy (Locaweb Cloud via Kamal)

- **1 web VM** (plan `small`, 20 GB disk) — roda a imagem única do repo
  (Go server + SPA embutida), escuta na porta 80, health check em `GET /up`.
  URL: `https://<web_ip>.nip.io` (TLS Let's Encrypt via kamal-proxy).
- **1 accessory `db`** (plan `small`, 20 GB disk) — Postgres
  `supabase/postgres:17.6.1.171`. Em rede interna CloudStack, hostname
  determinístico `db:5432` (DNS interno). Data em `/data/pgdata`.
- **Sem workers** — o app não tem jobs em background.

### Secrets (GitHub Actions)

| Secret | Origem | Uso |
|--------|--------|-----|
| `CLOUDSTACK_API_KEY` / `CLOUDSTACK_SECRET_KEY` | painel Locaweb Cloud | provision de VMs (o usuário cria no painel e grava no GitHub) |
| `SSH_PRIVATE_KEY` | gerada no setup | deploy Kamal + debug SSH |
| `POSTGRES_PASSWORD` | gerada no setup | senha do Postgres (derivada em `DATABASE_URL`) |
| `SENTRY_DSN` | painel Sentry (workshop) | reporting de erros (vazio = desativado) |

`DATABASE_URL` é **derivada** de `POSTGRES_PASSWORD` no `.kamal/secrets.preview`
(não é um GitHub Secret).

### Gatilho de deploy

- **`push` na `master`** → `deploy-preview.yml` (provision + Kamal).
- **`workflow_dispatch`** → também dispara `deploy-preview.yml` manualmente
  (útil para repetir um deploy sem criar um commit novo).
- O deploy **só acontece se os secrets `CLOUDSTACK_API_KEY`/`CLOUDSTACK_SECRET_KEY`
  existirem** no GitHub. Sem eles, o workflow falha no provision (sem provisionar
  nada). Sem `SENTRY_DSN`, o app sobe com Sentry desativado.
- **`workflow_dispatch`** → `teardown-preview.yml` (destrói o ambiente).

### Ambiente preview provisionado

| Recurso | Valor |
|---------|-------|
| URL | https://191.252.228.106.nip.io |
| Web VM | `191.252.228.106` (interna `10.1.1.86`) |
| DB VM (`db`) | `191.252.229.48` (interna resolvida por DNS como `db`) |
| Rede | `kanban-dev-app-1381981922-preview` |
| SSH | `ssh -i ~/.ssh/kanban-dev-app root@<ip>` |

## Pitfalls de deploy já enfrentados

- **`failed to detect signature algorithm` no passo "Install and configure
  CloudMonkey"** = `CLOUDSTACK_API_KEY`/`CLOUDSTACK_SECRET_KEY` inválidos
  (valor errado, ou com espaço/quebra de linha colada junto). Nada é
  provisionado quando isso acontece.
- **`password authentication failed for user "postgres"`** — o
  `supabase/postgres` só aplica `POSTGRES_PASSWORD` no **primeiro** `initdb`.
  Se o primeiro deploy gravou a senha errada, corrigir o workflow **não basta**:
  é preciso alterar a senha no cluster já existente
  (`ALTER USER postgres WITH PASSWORD ...` via `psql -U supabase_admin`) e
  manter o GitHub Secret em sincronia com esse mesmo valor.
- **Não truncar o nome da variável** no passo "Compose DATABASE_URL": a linha
  precisa referenciar `${POSTGRES_PASSWORD}` inteiro. Um nome parcial expande
  para vazio e o banco nasce com uma senha literal curta, enquanto o app
  conecta com a senha real → container web fica unhealthy e o deploy falha em
  `target failed to become healthy`.


## Notas

- **Sentry** — serviço externo SaaS. Não é um accessory de VM. No backend a
  integração já existe via `SENTRY_DSN` (`sentry-go`); DSN vazio = desativado.
  No frontend ela ainda **não** foi implementada (é um passo do workshop) — e
  quando for, a variável é `VITE_SENTRY_DSN`: a stack é Vite, não Next.js, e
  o prefixo `NEXT_PUBLIC_` (citado em notas antigas) nunca funcionaria aqui.
- Migrations rodam **no startup do container** (web VM única, sem race).
- **Sem reverse proxy próprio.** Quem termina TLS e roteia a porta 80/443 é o
  **kamal-proxy**, provisionado pelo Kamal na web VM. Instalar nginx (ou
  qualquer outro proxy) na frente disso está fora do padrão e conflita com o
  kamal-proxy pela porta 80.
