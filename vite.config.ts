import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const devHost = env.VITE_DEV_SERVER_HOST || '127.0.0.1';
    const devPort = Number(env.VITE_DEV_SERVER_PORT || 5173);

    return {
        server: {
            host: '0.0.0.0',
            port: devPort,
            strictPort: true,
            cors: true,
            origin: `http://${devHost}:${devPort}`,
            hmr: {
                host: devHost,
                clientPort: devPort,
            },
        },
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
            }),
            react({
                babel: {
                    plugins: ['babel-plugin-react-compiler'],
                },
            }),
            tailwindcss(),
            wayfinder({
                formVariants: true,
                command: 'node scripts/generate-wayfinder.cjs',
            }),
        ],
        esbuild: {
            jsx: 'automatic',
        },
    };
});
