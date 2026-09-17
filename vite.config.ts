import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
  },
  resolve: {
    // Use the unbundled entry so GM registration (@strudel/soundfonts → webaudio)
    // shares the same sound registry as initStrudel / playback.
    alias: [
      {
        find: '@strudel/web',
        replacement: path.resolve(root, 'node_modules/@strudel/web/web.mjs'),
      },
      // Avoid prebuilt dist copies that inline stale superdough helpers (spurious onended warnings).
      {
        find: '@strudel/webaudio',
        replacement: path.resolve(root, 'node_modules/@strudel/webaudio/index.mjs'),
      },
      {
        find: '@strudel/soundfonts',
        replacement: path.resolve(root, 'node_modules/@strudel/soundfonts/index.mjs'),
      },
    ],
    dedupe: ['@strudel/webaudio', '@strudel/core', 'superdough'],
  },
})
