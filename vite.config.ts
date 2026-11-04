import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import postcssCustomMedia from 'postcss-custom-media'
import type { Plugin as PostcssPlugin } from 'postcss'
import { defineConfig, type Plugin } from 'vite'
import { customMedia } from './src/shared/theme/breakpoints'
import { fontsUrl } from './src/shared/theme/typography'

// Makes the theme breakpoints available in every CSS file as `@media (--md-up)`.
const themeBreakpoints: PostcssPlugin = {
  postcssPlugin: 'theme-breakpoints',
  Once(root, { parse }) {
    root.prepend(parse(customMedia))
  },
}

// Loads the theme fonts once, in <head>, from the URL defined in the theme.
const themeFonts: Plugin = {
  name: 'theme-fonts',
  transformIndexHtml: () => [
    { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'stylesheet', href: fontsUrl }, injectTo: 'head' },
  ],
}

// GitHub Pages serves the site from https://<owner>.github.io/<repo-name>/
const pagesBasePath = '/tilt-store-os/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBasePath : '/',
  plugins: [react(), themeFonts],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    postcss: { plugins: [themeBreakpoints, postcssCustomMedia()] },
  },
}))
