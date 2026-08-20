/**
 * Headless render check.
 *
 * Server-renders the app and its main components against the live API, which
 * catches render-time crashes and missing content without needing a browser.
 * Run the API first, then: npm run test:render --workspace client
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API_BASE || 'http://localhost:4000/api';

execFileSync('npx', ['vite', 'build', '--config', 'vite.ssrcheck.config.js', '--logLevel', 'error'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

// Minimal browser stubs; the app reads localStorage during render.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.document = {
  documentElement: { setAttribute() {}, removeAttribute() {} },
  createElement: () => ({ style: {}, setAttribute() {} }),
  body: { appendChild() {}, removeChild() {} },
};

const json = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
};

const presets = await json(`${API}/presets`);
const result = await json(`${API}/paraphrase`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'It should be noted that the results were reviewed by the board, and it was determined that the outcome was very good.',
    tone: 'concise',
    persist: false,
  }),
});

const bundle = pathToFileURL(path.join(root, '.ssr-check', 'ssrcheck.js')).href;
const { render, renderWithData } = await import(bundle);

const app = render();
const parts = renderWithData({
  presets,
  options: { tone: 'concise', readabilityTarget: 'auto', intensity: 'balanced', preserveText: '' },
  result,
  history: [],
});

const expectations = {
  app: [app, ['HumanInzer', 'Your text', 'Skip to content', 'History', 'sketch-panel']],
  controls: [parts.controls, ['Settings', 'Concise', 'Reading level', 'Intensity', 'sketch-btn']],
  output: [parts.output, ['Output', 'Changes', 'Why', 'Metrics', 'Copy', 'Reading grade', 'sketch-tack']],
  metrics: [parts.metrics, ['Flesch-Kincaid Grade', 'Gunning Fog', 'SMOG', 'Coleman-Liau', 'Formality', 'Passive voice', 'sketch-meter']],
};

let failures = 0;
for (const [name, [html, needles]] of Object.entries(expectations)) {
  for (const needle of needles) {
    if (!html.includes(needle)) {
      console.error(`FAIL ${name}: missing "${needle}"`);
      failures++;
    }
  }
  console.log(`${failures ? 'checked' : 'ok'}   ${name.padEnd(9)} ${String(html.length).padStart(6)} bytes`);
}

if (failures) {
  console.error(`${failures} render check(s) failed`);
  process.exit(1);
}
console.log('render checks passed');
