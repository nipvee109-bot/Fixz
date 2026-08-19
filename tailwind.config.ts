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
        background: "#0B0418",
        surface: "#120924",
        "surface-card": "#1B0E36",
        "surface-border": "#2E1A5A",
        primary: {
          DEFAULT: "#8B5CF6",
          hover: "#7C3AED",
          neon: "#A855F7",
        },
        secondary: {
          DEFAULT: "#D946EF",
          glow: "#F43F5E",
        },
        cyber: {
          cyan: "#38BDF8",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
      },
      boxShadow: {
        "neon-violet": "0 0 25px rgba(139, 92, 246, 0.45)",
        "neon-fuchsia": "0 0 25px rgba(217, 70, 239, 0.45)",
        "neon-cyan": "0 0 20px rgba(56, 189, 248, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
