import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import modelUploadPlugin from './plugins/modelUpload';
export default defineConfig({ plugins: [react(), tailwindcss(), modelUploadPlugin()] });
