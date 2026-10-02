import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2020' },
  define: { 'import.meta.env.VITE_TESTER': JSON.stringify(process.env.VITE_TESTER === '1' ? '1' : '0') },
});
