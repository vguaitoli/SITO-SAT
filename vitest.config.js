import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configurazione dei test.
 *
 * Ambiente jsdom perché il parser GPX usa DOMParser, che in Node non esiste.
 * L'alias @ ricalca quello di vite.config.js: i moduli si importano con gli
 * stessi percorsi che usano nell'applicazione.
 *
 * L'ambito è ristretto a src/social-studio e scripts: i test coprono le
 * fondamenta, non il sito pubblico, che resta fuori da questo lavoro.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/social-studio/**/*.test.{js,jsx}", "scripts/**/*.test.mjs"],
    globals: false,
    restoreMocks: true,
  },
});
