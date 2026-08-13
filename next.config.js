/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paksa semua halaman jadi dynamic (tidak diprerender saat build)
  // karena semua halaman bergantung pada auth/cookie/DB runtime
  experimental: {
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("puppeteer-core", "@sparticuz/chromium");
    }
    return config;
  },
  images: {
    domains: ['api.qrcode-monkey.com'],
  },
};

module.exports = nextConfig;