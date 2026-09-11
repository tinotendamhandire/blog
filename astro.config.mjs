// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { alphaTab } from '@coderline/alphatab-vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.tinotenda.xyz',
  output: 'static',
  integrations: [svelte(), mdx()],

  vite: {
    // alphaTab's plugin copies its font/soundfont assets into public/ and
    // marks the bundle so alphaTab's runtime auto-resolves those paths —
    // no manual core.fontDirectory/player.soundFont config needed.
    plugins: [tailwindcss(), ...alphaTab()]
  }
});