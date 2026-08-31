import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Link dan router.push() diperiksa terhadap route yang benar-benar ada,
  // sehingga route mati tertangkap saat compile.
  typedRoutes: true,
};

export default nextConfig;
