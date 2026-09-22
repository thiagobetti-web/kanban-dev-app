import { sentryOnBuildEnd } from "@sentry/react-router";
import type { Config } from "@react-router/dev/config";

export default {
  // MUST stay false. This app ships as a pure client-side SPA served by the Go
  // binary (single container, no Node runtime in production). With `ssr: true`
  // the build emits build/client WITHOUT index.html plus a build/server bundle
  // nobody runs — the Go file server then has no shell to serve and every page
  // degrades to a directory listing of /assets. See docs/adr/004.
  // The Sentry wizard flips this flag; if it ever runs again, flip it back.
  ssr: false,

  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    // Sourcemap upload only when a Sentry auth token is configured; builds
    // without it (CI, local, Docker) must not fail.
    if (!process.env.SENTRY_AUTH_TOKEN) return;
    await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
  },
} satisfies Config;
