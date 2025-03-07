import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export function setupVite() {
    return defineConfig({
        root: "client",
        plugins: [react()],
        build: {
            outDir: "../dist",
            rollupOptions: {
                input: "client/index.html", // Ensure correct entry point
            },
        },
    });
}

export function serveStatic() {
    console.log("Serving static files...");
}