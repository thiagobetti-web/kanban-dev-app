import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard for the outage where the app served a directory listing of
// /assets instead of the board.
//
// This app ships as a pure client-side SPA inside a single container: the Go
// binary serves the files produced by `react-router build` and there is no
// Node process in production. Only `ssr: false` makes the build emit
// build/client/index.html — the shell the Go file server needs. With
// `ssr: true` there is no index.html, so every page request falls through to a
// directory listing of the assets folder.
//
// The Sentry setup wizard flips this flag to true (it wants a server build for
// sourcemap upload). If it runs again, this test fails instead of the deploy.
//
// Vitest runs with jsdom, where import.meta.url is not a file:// URL, so the
// path is resolved from the Vitest root (frontend/) instead.
const configSource = readFileSync(
  path.resolve(process.cwd(), "react-router.config.ts"),
  "utf8",
);

describe("react-router.config.ts", () => {
  it("builds a client-only SPA (ssr must be false)", () => {
    expect(configSource).toMatch(/^\s*ssr:\s*false,?\s*$/m);
    expect(configSource).not.toMatch(/^\s*ssr:\s*true/m);
  });
});
