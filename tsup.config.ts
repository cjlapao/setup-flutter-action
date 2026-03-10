import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/main.js' },
  format: ['cjs'],
  platform: 'node',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  bundle: true,
  noExternal: [/.*/],
  esbuildOptions(options) {
    options.conditions = ['import', 'default']
  }
})
