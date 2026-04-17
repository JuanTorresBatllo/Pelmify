import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7ff",
          500: "#4f7cff",
          600: "#3b5fd9",
          700: "#2f4cb0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
