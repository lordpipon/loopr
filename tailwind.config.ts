import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.tsx", "./components/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        like: "#F91880",
        repost: "#00BA7C",
      },
      borderRadius: { card: "16px", menu: "12px" },
      boxShadow: { menu: "0 0 15px rgba(101,119,134,0.2), 0 0 3px rgba(101,119,134,0.15)" },
      screens: { rail: "700px", sidebar: "1000px", wide: "1280px" },
      fontSize: { body: ["15px", "20px"], meta: ["13px", "16px"] },
      transitionDuration: { DEFAULT: "200ms" },
    },
  },
} satisfies Config;
