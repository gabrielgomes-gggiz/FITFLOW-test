import path from "node:path";
import { defineConfig } from "vitest/config";

// Configuração de testes separada do vite.config.ts (que carrega plugins do Figma Make).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Fuso fixo: garante que os testes de data valem em qualquer máquina.
    env: { TZ: "America/Sao_Paulo" },
  },
});
