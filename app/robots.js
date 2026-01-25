export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jokiwi.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/register", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}