import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';

// The build id: the commit on CI, else the local commit plus a timestamp (local builds of
// the same commit still differ). It is compiled in as __BUILD_ID__ and published beside
// the page as version.json, which the running game polls to notice a new deploy.
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  let sha = 'dev';
  try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* no git */ }
  return `${sha}-${Date.now().toString(36)}`;
}

function version(id: string): Plugin {
  const json = JSON.stringify({ id });
  return {
    name: 'version-json',
    config: () => ({ define: { __BUILD_ID__: JSON.stringify(id) } }),
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: json }); },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/version.json')) return next();
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(json);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [version(buildId())],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
