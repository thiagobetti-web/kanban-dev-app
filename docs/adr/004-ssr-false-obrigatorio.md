# 004 - `ssr: false` é obrigatório: o wizard do Sentry derrubou a interface

**Status:** Accepted

## Context

Depois de instalar o Sentry no frontend, o app publicado parou de mostrar a
interface. Não caiu no sentido de "fora do ar": `GET /up` respondia 200, a API
respondia normalmente e o deploy do Kamal passava verde. Mas abrir a URL
devolvia uma listagem de diretório:

```html
<!doctype html>
<pre><a href="assets/">assets/</a></pre>
```

A causa foi o wizard de instalação do Sentry, que alterou
`frontend/react-router.config.ts` de `ssr: false` para `ssr: true`, com o
comentário *"SSR is required for Sentry sourcemap uploads"*.

Essa mudança é incompatível com a arquitetura do projeto. O app é uma **SPA
pura servida pelo binário Go** — um único container, sem processo Node em
produção (ADR 001/003). O `react-router build`:

- com `ssr: false` → gera `build/client/index.html` (o "shell" da SPA) mais os
  assets;
- com `ssr: true` → **não gera `index.html`**; gera `build/server/index.js`,
  um servidor Node que ninguém executa na nossa imagem.

Sem `index.html`, o handler de arquivos estáticos (`handler.RegisterFrontend`)
não tem shell para servir e toda requisição de página cai no fallback — que
neste caso expunha a pasta de assets.

O wizard também adicionou rotas de exemplo (`/sentry-example-page`,
`/api/sentry-example-api`), uma delas um endpoint que **lança uma exceção de
propósito**, e `instrument.server.mjs` + `@sentry/profiling-node` — artefatos
de um runtime Node que não existe aqui.

## Decision

- `ssr` fica **`false`**, permanentemente, com comentário explicando por quê.
- Um teste (`frontend/app/build-config.test.ts`) lê o arquivo de configuração
  e falha se `ssr: true` voltar.
- O `Dockerfile` verifica `build/client/index.html` logo após o `npm run build`
  e **falha o build** se o arquivo não existir — nenhuma imagem quebrada chega
  a ser publicada.
- As rotas de exemplo do Sentry, o `instrument.server.mjs` e a dependência
  `@sentry/profiling-node` foram removidos: são código de servidor Node,
  inaplicável a esta stack.
- O `buildEnd` do Sentry só roda quando `SENTRY_AUTH_TOKEN` está presente, para
  que builds sem token (CI, Docker, local) não quebrem.

## Rationale

Repete-se aqui a lição do ADR 003: **`/up` não prova que o app é utilizável.**
Duas vezes seguidas uma regressão puramente de frontend passou por um deploy
verde. A defesa não é "lembrar de checar" — é ter o build falhar.

Sobre sourcemaps: o Sentry consegue receber sourcemaps de um build client-only
(o upload via `sentryReactRouter`/CLI não exige SSR). Mesmo que exigisse,
trocar a arquitetura de entrega do app para satisfazer uma ferramenta de
observabilidade é a troca errada.

## Trade-offs

**Pros:**
- A interface volta a funcionar em qualquer ambiente publicado.
- A regressão específica passa a quebrar o CI, não a produção.
- O Dockerfile deixou de conseguir produzir uma imagem sem interface.

**Cons:**
- Wizards de terceiros que assumem SSR precisarão de ajuste manual.
- Sem SSR não há instrumentação de servidor do Sentry no frontend (o backend Go
  já reporta via `sentry-go`).

## Alternatives Considered

- **Manter `ssr: true` e rodar o servidor Node do React Router:** descartado —
  significa um segundo processo/container, contrariando o Dockerfile único e o
  padrão de deploy (ADR 001).
- **Servir `build/server/index.js` pelo Go:** impossível; é um bundle Node.
- **Gerar `index.html` à mão:** frágil — o arquivo referencia hashes de assets
  que mudam a cada build.
