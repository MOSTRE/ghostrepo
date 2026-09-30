/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ghostrepo/core',
    '@ghostrepo/github',
    '@ghostrepo/scoring',
    '@ghostrepo/dependencies',
    '@ghostrepo/reports',
  ],
};

export default nextConfig;
