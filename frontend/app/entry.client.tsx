import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

const tracing = Sentry.reactRouterTracingIntegration();

Sentry.init({
  dsn: "https://0350ccd24977b837e11968e28b8562bb@o4512131437035520.ingest.us.sentry.io/4512131442671616",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [tracing, Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: [/^\//, /^https:\/\/yourserver\.io\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter
        instrumentations={[tracing.clientInstrumentation]}
        onError={Sentry.sentryOnError} />
    </StrictMode>,
  );
});