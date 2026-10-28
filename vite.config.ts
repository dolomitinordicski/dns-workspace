import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dns-workspace/',
  build: { rollupOptions: { input: {
    workspace: fileURLToPath(new URL('./index.html', import.meta.url)),
    digitalPass: fileURLToPath(new URL('./pass.html', import.meta.url)),
  } } },
});
