import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      '/api/reviews': {
        target: 'https://kusum-s-dental-care.vercel.app',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/image': path.resolve(__dirname, './src/components/ui/next-image-shim.tsx'),
    },
  },
});
