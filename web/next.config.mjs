/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '192.168.68.105' },
      { protocol: 'https', hostname: 'clique-app.onrender.com' },
    ],
  },
};

export default nextConfig;
