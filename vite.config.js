import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { allowedHosts: ["terminal.local"] },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: { genlayer: ["genlayer-js", "genlayer-js/chains"] },
      },
    },
  },
});
