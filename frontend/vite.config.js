import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    const certDir = env.VITE_CERT_DIR || './certs'

    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            port: Number(env.VITE_PORT || 5173),
            https: {
                key: fs.readFileSync(path.resolve(certDir, 'key.pem')),
                cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
            },
        },
    }
})
