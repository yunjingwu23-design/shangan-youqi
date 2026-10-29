import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [
    "@sparticuz/chromium",
    "playwright-core",
    "mammoth",
    "unpdf",
  ],
  outputFileTracingIncludes: {
    "/api/resume/export": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./public/fonts/**/*.woff2",
    ],
  },
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
