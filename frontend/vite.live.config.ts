import path from "node:path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

if (process.env.IGNITE_LIVE_BUILD !== "1") {
  throw new Error("Live builds must use the guarded build:live script");
}

const root = process.cwd();

export default defineConfig({
  envDir: false,
  envPrefix: "IGNITE_LIVE_",
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(root, "src/integrations/supabase/liveClient.ts"),
      },
      {
        // Swaps the lab-only (localhost-restricted) Internet Identity auth
        // module for the live mainnet/Cloud Engine one, without touching
        // `IcpAuthProvider` in `src/hooks/useAuth.tsx`, which dynamically
        // imports this specifier either way.
        find: "@/lab/internetIdentityAuth",
        replacement: path.resolve(root, "src/live/internetIdentityAuth.ts"),
      },
      { find: "@", replacement: path.resolve(root, "src") },
    ],
  },
  plugins: [
    visualizer({
      filename: "dist-live/bundle-analysis.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    visualizer({
      filename: "dist-live/bundle-analysis.json",
      template: "raw-data",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  build: {
    outDir: "dist-live",
    emptyOutDir: true,
    target: ["es2020", "safari15"],
    sourcemap: false,
    rollupOptions: {
      input: "live-index.html",
    },
  },
});
