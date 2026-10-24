import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const cert = process.env.HTTPS_CERT;
const key = process.env.HTTPS_KEY;
if (Boolean(cert) !== Boolean(key)) throw new Error('HTTPS_CERTとHTTPS_KEYは両方指定してください。');
const https = cert && key ? { cert: readFileSync(cert), key: readFileSync(key) } : undefined;

export default defineConfig({
  server: { https },
  preview: { https },
  build: { target: ['es2022', 'safari16.4'] },
});
