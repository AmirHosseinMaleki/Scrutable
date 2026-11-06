import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output, no server, no database.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
