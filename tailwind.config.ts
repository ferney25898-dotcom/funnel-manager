import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: "#7C3AED",
        sidebar: "#1E1B2E",
        "role-ads": "#F59E0B",
        "role-copy": "#3B82F6",
        "role-design": "#EC4899",
        "role-video": "#8B5CF6",
        "role-closer": "#10B981",
        "role-community": "#F97316",
        "role-tech": "#7C3AED",
      },
    },
  },
  plugins: [],
};
export default config;
