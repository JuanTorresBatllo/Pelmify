import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Warm alpine palette inspired by the Pelmo logo (sepia ink, cream,
        // edelweiss sage, ochre centre of the flowers).
        brand: {
          50:  "#f8f2e6",
          100: "#ede0c6",
          200: "#d9c198",
          300: "#b89a6c",
          400: "#8a6f49",
          500: "#5c4629",
          600: "#463321",
          700: "#332519",
          800: "#201710",
          900: "#120d09",
        },
        cream: {
          50:  "#fbf8f1",
          100: "#f5efe2",
          200: "#ece2cb",
        },
        moss: {
          300: "#aebb9c",
          500: "#6b8363",
          700: "#435239",
        },
        ochre: {
          400: "#d4a64a",
          500: "#c48b2a",
          600: "#9a6d1f",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(70,51,33,0.05), 0 4px 16px rgba(70,51,33,0.06)",
        lift: "0 2px 4px rgba(70,51,33,0.06), 0 12px 32px rgba(70,51,33,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
