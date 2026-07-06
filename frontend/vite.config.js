import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), "");
    const certDir = env.VITE_CERT_DIR || "./certs";
    const keyPath = path.resolve(certDir, "key.pem");
    const certPath = path.resolve(certDir, "cert.pem");
    const https = fs.existsSync(keyPath) && fs.existsSync(certPath)
        ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        }
        : false;

    return {
        plugins: [react()],
        server: {
            host: "0.0.0.0",
            port: Number(env.VITE_PORT || 5173),
            https,
        },
    };
});
