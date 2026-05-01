import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const publicDir = new URL('../public/', import.meta.url);
mkdirSync(publicDir, { recursive: true });

const teal = [15, 118, 110, 255];
const ink = [17, 24, 39, 255];
const white = [255, 255, 255, 255];
const mint = [209, 250, 229, 255];

const faviconSizes = [16, 32, 48, 64, 128, 180, 192, 512];
const iconPngs = new Map();

for (const size of faviconSizes) {
  const png = createIconPng(size);
  const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
  iconPngs.set(size, png);
  writeFileSync(new URL(name, publicDir), png);
}

writeFileSync(new URL('favicon.ico', publicDir), encodeIco([16, 32, 48].map((size) => ({ size, bytes: iconPngs.get(size) }))));
writeFileSync(new URL('favicon.svg', publicDir), createFaviconSvg());
writeFileSync(new URL('og-image.png', publicDir), createOgPng());
writeFileSync(
  new URL('site.webmanifest', publicDir),
  `${JSON.stringify(
    {
      name: 'Website Asset Generator',
      short_name: 'Asset Generator',
      description: 'Create and test favicons and Open Graph images locally.',
      icons: [
        { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' }
      ],
      theme_color: '#0f766e',
      background_color: '#eef3f8',
      display: 'standalone'
    },
    null,
    2
  )}\n`
);

function createIconPng(size) {
  const rgba = new Uint8Array(size * size * 4);
  const radius = size * 0.18;
  const pad = Math.max(1, Math.round(size * 0.12));
  const barHeight = Math.max(2, Math.round(size * 0.12));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const inside = roundedRectContains(x + 0.5, y + 0.5, pad, pad, size - pad * 2, size - pad * 2, radius);
      const pixel = inside ? teal : [0, 0, 0, 0];
      rgba.set(pixel, index);
    }
  }

  const innerPad = Math.round(size * 0.29);
  paintRoundedRect(rgba, size, innerPad, innerPad, size - innerPad * 2, size - innerPad * 2, size * 0.08, white);
  paintRoundedRect(rgba, size, Math.round(size * 0.35), Math.round(size * 0.43), Math.round(size * 0.3), barHeight, barHeight / 2, mint);
  paintRoundedRect(rgba, size, Math.round(size * 0.35), Math.round(size * 0.57), Math.round(size * 0.22), barHeight, barHeight / 2, mint);

  return encodePng(size, size, rgba);
}

function createOgPng() {
  const width = 1200;
  const height = 630;
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const t = x / width;
      const v = y / height;
      rgba[index] = Math.round(17 + t * 16);
      rgba[index + 1] = Math.round(24 + t * 94 + v * 20);
      rgba[index + 2] = Math.round(39 + t * 71);
      rgba[index + 3] = 255;
    }
  }

  paintRoundedRect(rgba, width, 86, 92, 170, 12, 6, teal);
  paintRoundedRect(rgba, width, 85, 160, 146, 146, 28, teal);
  paintRoundedRect(rgba, width, 121, 196, 74, 74, 12, white);
  paintRoundedRect(rgba, width, 136, 228, 48, 10, 5, mint);
  paintRoundedRect(rgba, width, 136, 246, 34, 10, 5, mint);

  paintTextBars(rgba, width, 300, 174, [680, 610, 520], 38, 18, white);
  paintTextBars(rgba, width, 300, 402, [520, 430], 20, 14, [203, 213, 225, 255]);
  paintTextBars(rgba, width, 86, 548, [245], 18, 10, white);

  return encodePng(width, height, rgba);
}

function paintTextBars(rgba, canvasWidth, x, y, widths, height, gap, color) {
  widths.forEach((width, index) => {
    paintRoundedRect(rgba, canvasWidth, x, y + index * (height + gap), width, height, height / 2, color);
  });
}

function paintRoundedRect(rgba, canvasWidth, x, y, width, height, radius, color) {
  const canvasHeight = rgba.length / 4 / canvasWidth;
  const minX = Math.max(0, Math.floor(x));
  const maxX = Math.min(canvasWidth, Math.ceil(x + width));
  const minY = Math.max(0, Math.floor(y));
  const maxY = Math.min(canvasHeight, Math.ceil(y + height));

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      if (!roundedRectContains(px + 0.5, py + 0.5, x, y, width, height, radius)) continue;
      rgba.set(color, (py * canvasWidth + px) * 4);
    }
  }
}

function roundedRectContains(px, py, x, y, width, height, radius) {
  const rx = Math.min(radius, width / 2);
  const ry = Math.min(radius, height / 2);
  const cx = Math.max(x + rx, Math.min(px, x + width - rx));
  const cy = Math.max(y + ry, Math.min(py, y + height - ry));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rx * ry;
}

function createFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="8" y="8" width="48" height="48" rx="12" fill="#0f766e"/>
  <rect x="20" y="20" width="24" height="24" rx="5" fill="#fff"/>
  <rect x="24" y="28" width="16" height="5" rx="2.5" fill="#d1fae5"/>
  <rect x="24" y="37" width="12" height="5" rx="2.5" fill="#d1fae5"/>
</svg>
`;
}

function encodeIco(entries) {
  const headerSize = 6;
  const directorySize = entries.length * 16;
  const totalSize = headerSize + directorySize + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = headerSize + directorySize;

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, entries.length, true);

  entries.forEach((entry, index) => {
    const directoryOffset = headerSize + index * 16;
    view.setUint8(directoryOffset, entry.size);
    view.setUint8(directoryOffset + 1, entry.size);
    view.setUint8(directoryOffset + 2, 0);
    view.setUint8(directoryOffset + 3, 0);
    view.setUint16(directoryOffset + 4, 1, true);
    view.setUint16(directoryOffset + 6, 32, true);
    view.setUint32(directoryOffset + 8, entry.bytes.length, true);
    view.setUint32(directoryOffset + 12, offset, true);
    bytes.set(entry.bytes, offset);
    offset += entry.bytes.length;
  });

  return Buffer.from(buffer);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * stride;
    const rgbaOffset = y * width * 4;
    raw[rawOffset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + rgbaOffset, width * 4).copy(raw, rawOffset + 1);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', makeIhdr(width, height)),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function makeIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
