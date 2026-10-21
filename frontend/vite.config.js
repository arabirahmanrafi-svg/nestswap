import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, requests to /api and /uploads are forwarded to the Spring Boot
// server, so the browser sees one origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
    },
  },
});
