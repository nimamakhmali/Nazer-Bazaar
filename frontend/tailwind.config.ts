// tailwind.config.ts
// Tailwind CSS v4 - configuration moved to globals.css via @theme
// This file is kept for compatibility but has no effect in v4

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;