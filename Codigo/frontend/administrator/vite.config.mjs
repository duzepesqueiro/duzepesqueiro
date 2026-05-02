import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    build: {
      chunkSizeWarningLimit: 2000,
    },
    plugins: [tsconfigPaths({ projects: ["./jsconfig.json"] }), react(), tagger()],
    server: {
      port: "4028",
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: [".amazonaws.com", ".builtwithrocket.new"],
    },
  };
});
