import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli');
// Expo uses sextant Unicode characters on some terminals (e.g. Ghostty).
// Force its widely supported half-block QR renderer, independent of the font.
const result = spawnSync(process.execPath, [cli, 'start', '--lan', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, COLOR: '0' },
});
if (result.error) throw result.error;
process.exit(result.status ?? (result.signal === 'SIGINT' ? 130 : 1));
