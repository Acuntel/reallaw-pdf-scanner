import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // REAL Law brand palette
        navy: {
          DEFAULT: "#0a2540",
          deep: "#061a2f",
          light: "#13355c",
        },
        gold: {
          DEFAULT: "#c9a961",
          light: "#e0c178",
          deep: "#a3873e",
        },
        cream: "#faf7f2",
        paper: "#ffffff",
        ink: "#0b0b0c",
        // Status colors
        ok: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
        verify: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
        action: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10,37,64,0.06), 0 8px 24px rgba(10,37,64,0.06)",
        gold: "0 0 0 1px rgba(201,169,97,0.4), 0 4px 12px rgba(201,169,97,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
