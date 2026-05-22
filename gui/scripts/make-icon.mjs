// Crop/extend the horizontal brand logo into a square PNG suitable for
// `pnpm tauri icon`. Reads ../../branding/logo-2.png, centres it inside
// a square canvas with a transparent background, writes ../icons/source.png.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../branding/logo-2.png');
const dst = path.resolve(here, '../icons/source.png');

const meta = await sharp(src).metadata();
const size = Math.max(meta.width ?? 1024, meta.height ?? 1024);

await sharp(src)
  .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(dst);

console.log(`wrote ${dst} (${size}x${size})`);
