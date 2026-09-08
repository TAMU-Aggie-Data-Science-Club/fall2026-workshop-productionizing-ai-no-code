import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { BASE_PATH } from './lib/paths';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

// The lab exports static pages for Vercel; it has no Worker runtime or bindings.
export default defineConfig({
  // Vercel mounts the static export here. vinext's basePath currently skips
  // lesson prerendering, so use Vite's asset base and explicit app links.
  base: `${BASE_PATH}/`,
  css: { postcss: { plugins: [tailwindcss()] } },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [vinext(), sites()],
});
