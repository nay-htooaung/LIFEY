import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        surface: {
          DEFAULT: "#0D0D1F",
          container: "#1C1C30",
        },
        outline: {
          DEFAULT: "#2D2D45",
        },
      },
      fontSize: {
        "2.5xl": ["28px", { lineHeight: "1.2" }],
      },
      borderRadius: {
        "10px": "10px",
        "20px": "20px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
