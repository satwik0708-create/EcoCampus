import type { MetadataRoute } from "next";

/**
 * The public pages are indexable; everything behind authentication is not.
 * This is a courtesy to crawlers, not a security control — the real
 * protection is the server-side session check on every /student and /admin
 * route.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/sdg-12"],
      disallow: ["/student/", "/admin/", "/api/", "/reset-password"],
    },
  };
}
