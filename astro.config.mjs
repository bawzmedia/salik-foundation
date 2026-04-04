import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://salikfoundation.ca',
  output: 'static',
  adapter: vercel(),
  integrations: [
    svelte(),
    sitemap(),
  ],
});
