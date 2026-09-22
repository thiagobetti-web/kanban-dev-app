import { sentryReactRouter } from "@sentry/react-router";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(config => ({
  plugins: [tailwindcss(), reactRouter(), sentryReactRouter({
    org: "locaweb-m2",
    project: "javascript-react-router",
    authToken: process.env.SENTRY_AUTH_TOKEN
  }, config)],

  resolve: {
    tsconfigPaths: true,
  },

  server: {
    host: true, // bind all interfaces (reachable via container bridge IP)
    proxy: {
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
    },
  },

  optimizeDeps: {
    exclude: ["@sentry/react-router"]
  }
}));
