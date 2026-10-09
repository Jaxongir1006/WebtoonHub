import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
let sequence = 0;

/** Execute the real TypeScript utility without adding a browser/test dependency. */
export async function loadUtility(relativePath) {
  const source = await readFile(new URL(relativePath, root), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  });
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}

/** Bundle imports for the client while keeping one real, mockable Axios instance. */
export async function loadClient() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('src/api/client.ts', root))],
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1'),
      'import.meta.env.BASE_URL': JSON.stringify('/')
    },
    plugins: [{
      name: 'shared-axios',
      setup(builder) {
        builder.onResolve({ filter: /^axios$/ }, () => ({
          path: pathToFileURL(require.resolve('axios')).href, external: true
        }));
      }
    }]
  });
  const code = result.outputFiles[0].text + `\n// isolated test instance ${sequence++}`;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

/** Use React's real hooks in server rendering, with explicit API/context seams. */
export async function loadModuleWithMocks(relativePath, mocks) {
  const registry = globalThis.__webtoonhubTestModules ||= new Map();
  const id = 'module-' + sequence++;
  registry.set(id, mocks);
  try {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(relativePath, root))],
      bundle: true, write: false, format: 'esm', platform: 'node',
      define: {
        'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1'),
        'import.meta.env.BASE_URL': JSON.stringify('/')
      },
      plugins: [{
        name: 'test-seams',
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            if (Object.hasOwn(mocks, path)) return { path, namespace: 'test-mock' };
            if (/^(react(?:\/.*)?|axios)$/.test(path)) return { path: pathToFileURL(require.resolve(path)).href, external: true };
          });
          builder.onLoad({ filter: /.*/, namespace: 'test-mock' }, ({ path }) => ({
            contents: `const binding = globalThis.__webtoonhubTestModules.get(${JSON.stringify(id)})[${JSON.stringify(path)}];\n` + Object.keys(mocks[path]).map(name => name === 'default' ? 'export default binding.default;' : `export const ${name} = binding.${name};`).join('\n'),
            loader: 'js'
          }));
        }
      }]
    });
    return await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + `\n// ${id}`).toString('base64'));
  } finally {
    registry.delete(id);
  }
}

export function installBrowserGlobals(t) {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
  for (const [key, value] of Object.entries({
    localStorage: storage, window: new EventTarget(),
    navigator: { language: 'en-US', userAgent: 'Test Mobile Android' }
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  return { storage, values, window: globalThis.window };
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export const axios = require('axios');
export const response = (config, data, status = 200) => ({ data, status, statusText: String(status), headers: {}, config });
export function unauthorized(config) {
  return new axios.AxiosError('Access token expired', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 401));
}
