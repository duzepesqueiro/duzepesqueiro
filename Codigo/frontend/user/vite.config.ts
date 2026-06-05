console.log("VITE CONFIG CARREGADO");
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    server: {
      host: '0.0.0.0',
      port: 8081,
      strictPort: true,
      allowedHosts: [
        '.ngrok-free.dev',
        '.ngrok.app',
        'localhost'
      ],
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});