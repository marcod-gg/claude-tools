import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Compila a Content/dataviews (lo sirve IIS tal cual; el csproj lo incluye). El build se commitea:
// Jenkins solo tiene MSBuild, sin Node.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../Content/dataviews',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.tsx',
      output: { entryFileNames: 'dataviews.js', assetFileNames: 'dataviews[extname]' },
    },
  },
  test: { environment: 'node' },
});
