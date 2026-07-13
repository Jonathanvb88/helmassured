/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit ships its own .afm font files and resolves them via relative paths
  // at runtime. Webpack bundling breaks those relative paths — excluding it
  // here means it's required normally from node_modules instead, which keeps
  // its internal file structure intact. Next.js 14.2.x needs this under
  // experimental — the top-level serverExternalPackages key only exists from 14.3+.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
};

export default nextConfig;
