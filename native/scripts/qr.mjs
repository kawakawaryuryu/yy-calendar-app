import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { toQR } from 'toqr';

// Pass the Metro URL printed by Expo, including its current LAN host and port.
const value = process.argv[2];
if (!value || !/^exps?:\/\/[^\s]+$/.test(value)) {
  console.error('Usage: pnpm --dir native qr exp://<MetroのIPアドレス>:<ポート>');
  process.exit(1);
}
new URL(value);
const matrix = toQR(value);
const extent = Math.sqrt(matrix.length);
const scale = 12;
const margin = 4; // QR quiet zone: four full modules on every side.
const size = (extent + margin * 2) * scale;
const pixels = Buffer.alloc((size + 1) * size, 255);
for (let y = 0; y < size; y++) {
  pixels[y * (size + 1)] = 0; // PNG filter: none.
  for (let x = 0; x < size; x++) {
    const row = Math.floor(y / scale) - margin;
    const col = Math.floor(x / scale) - margin;
    if (row >= 0 && col >= 0 && row < extent && col < extent && matrix[row * extent + col]) pixels[y * (size + 1) + x + 1] = 0;
  }
}
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8; // 8-bit grayscale, no alpha/interlace.
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
const directory = fileURLToPath(new URL('../../artifacts/', import.meta.url));
await mkdir(directory, { recursive: true });
const output = path.join(directory, 'expo-go-qr.png');
await writeFile(output, png);
console.log(`Expo Go: ${value}\nQR画像: ${output}\nPCで画像を開き、iPhoneのカメラで読み取ってください（Expo Goが必要です）。`);
