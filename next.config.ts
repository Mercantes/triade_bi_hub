import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (há outros lockfiles na máquina).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
