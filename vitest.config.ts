import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig, para os testes enxergarem "@/..."
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
