import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a tablet/phone on the same Wi-Fi open the dev server via http://<PC IP>:3000
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
