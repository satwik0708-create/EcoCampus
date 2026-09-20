import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * `script-src` includes `'unsafe-inline'`, and that is a deliberate,
 * documented trade-off rather than an oversight:
 *
 *   - Next.js hydrates through an inline bootstrap script. The strict
 *     alternative is a per-request nonce, but a nonce can only be injected
 *     into a *dynamically rendered* page — Next cannot stamp one onto HTML
 *     that was prerendered at build time. Several pages here (the landing
 *     page, the auth screens) are deliberately static for performance, so a
 *     nonce policy would silently block their hydration and leave every form
 *     on those pages inert. A policy that breaks the product is not security.
 *
 *   - What offsets it: this application renders no caller-supplied HTML
 *     anywhere. There is no `dangerouslySetInnerHTML` in the codebase, and
 *     administrator-authored article bodies are parsed as plain text (see
 *     `src/components/ui/article-body.tsx`), so there is no injection point
 *     for an inline `<script>` in the first place. `script-src 'self'` still
 *     blocks every externally hosted script, `object-src 'none'` blocks
 *     plugin content, and `frame-ancestors 'none'` blocks clickjacking.
 *
 *   - To tighten this further, mark the public and auth routes dynamic
 *     (`export const dynamic = "force-dynamic"`), reinstate a nonce in
 *     middleware, and set the CSP on the *request* headers so Next can read
 *     the nonce from it. That trades static rendering for a stricter policy.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and Recharts both apply element styles at runtime.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ["src", "prisma", "tests"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
