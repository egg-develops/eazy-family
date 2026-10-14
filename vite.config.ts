import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  // Auto-discovery deadlocks on this project's dep graph.
  // noDiscovery skips the scan; only packages listed in include are pre-bundled.
  optimizeDeps: {
    noDiscovery: true,
    include: [
      // React (CJS — must be pre-bundled for ESM interop)
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      '@supabase/supabase-js',
      // i18next's Trans pulls in html-parse-stringify -> void-elements, which is
      // CJS with no ESM default export. With noDiscovery the chain is never
      // pre-bundled, so the dev server serves it raw and the app boots blank
      // ("does not provide an export named 'default'"). Pre-bundling react-i18next
      // inlines the whole chain. Production is unaffected (Rollup handles CJS).
      'i18next',
      'react-i18next',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-popover'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
