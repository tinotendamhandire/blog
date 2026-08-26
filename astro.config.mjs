// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.tinotenda.xyz',
  output: 'static',
  integrations: [svelte(), mdx()],

  vite: {
    plugins: [tailwindcss()]
  }
});