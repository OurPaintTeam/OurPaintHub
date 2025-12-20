import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs';

// https://vite.dev/config/
export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./frontend/certs/key.pem'),
      cert: fs.readFileSync('./frontend/certs/cert.pem')
    },
    port: 5173,
  },
});
