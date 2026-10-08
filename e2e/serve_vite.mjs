import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const kind = process.argv[2];
if (!['frontend', 'admin'].includes(kind)) throw new Error('Choose frontend or admin');
const root = path.join(path.dirname(directory), kind);
// PostCSS/Tailwind discover their existing configuration from the app cwd.
process.chdir(root);
process.env.VITE_API_URL = kind === 'admin' ? '/api/v1/staff' : '/api/v1';
process.env.VITE_BASE_PATH = '/';
const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
const target = 'http://127.0.0.1:58180';
const server = await createServer({
  root,
  configFile: path.join(root, kind === 'admin' ? 'vite.config.js' : 'vite.config.ts'),
  server: {
    host: '127.0.0.1', port: Number(process.argv[3]), strictPort: true,
    proxy: { '/api': { target, changeOrigin: true }, '/content': { target, changeOrigin: true } },
  },
});
await server.listen();
server.printUrls();
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await server.close(); process.exit(0); });
