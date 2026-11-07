import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static output, no server, no database.
export default defineConfig({
  output: 'static',
  integrations: [react()],
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
