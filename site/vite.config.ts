import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/* Builds to site/dist. At M7 the assemble step lays that beside terminal/, admin.html, enter/ and
   the Pages Functions for Cloudflare Pages; until then GitHub Pages serves the vanilla page. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
});
