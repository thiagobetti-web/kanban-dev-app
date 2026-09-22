import { sentryOnBuildEnd } from "@sentry/react-router";
import type { Config } from "@react-router/dev/config";

export default {
  // Changed to true - SSR is required for Sentry sourcemap uploads
  ssr: true,

  buildEnd: async (
    {
      viteConfig: viteConfig,
      reactRouterConfig: reactRouterConfig,
      buildManifest: buildManifest
    }
  ) => {
    await sentryOnBuildEnd({
      viteConfig: viteConfig,
      reactRouterConfig: reactRouterConfig,
      buildManifest: buildManifest
    });
  }
} satisfies Config;
