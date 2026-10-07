import { defineConfig } from 'vite';

/**
 * 使用相对 base（'./'），构建产物可以放在任意子路径下直接运行，
 * 因此 GitHub Pages 的项目站点（/rainbow-ranch/）和本地静态服务器都能直接打开。
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
