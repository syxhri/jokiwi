/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    if (isServer) {
      // pastiin array-nya ada
      config.externals = config.externals || [];

      // jangan dibundle / di-transform sama Next
      config.externals.push("puppeteer-core", "@sparticuz/chromium");
    }
    return config;
  },
};

module.exports = nextConfig;