import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
            manifest: {
                name: "Whelsplit",
                short_name: "Whelsplit",
                description: "Split shared expenses with friends and family.",
                theme_color: "#14532d",
                background_color: "#f8fafc",
                display: "standalone",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/svg+xml",
                        purpose: "any maskable",
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "any maskable",
                    },
                ],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],
});
