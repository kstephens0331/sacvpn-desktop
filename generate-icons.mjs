import sharp from 'sharp';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, 'src-tauri', 'icons');
const svgPath = join(__dirname, 'public', 'sacvpn-icon.svg');

// Create a simple shield icon as fallback if SVG doesn't work
const createShieldSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
  </defs>
  <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="url(#grad)"/>
  <path d="M10 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function generateIcons() {
  // Ensure icons directory exists
  await fs.mkdir(iconsDir, { recursive: true });

  const sizes = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
    { name: 'icon.png', size: 512 },  // For tray icon
  ];

  console.log('Reading SVG icon...');
  let svgBuffer;
  try {
    svgBuffer = await fs.readFile(svgPath);
  } catch {
    console.log('SVG not found, using generated shield icon');
    svgBuffer = Buffer.from(createShieldSvg(1024));
  }

  // Generate PNG files
  for (const { name, size } of sizes) {
    console.log(`Generating ${name}...`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, name));
  }

  // Generate icon.ico (Windows) - contains multiple sizes
  console.log('Generating icon.ico...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngs = await Promise.all(
    icoSizes.map(size => sharp(svgBuffer).resize(size, size).png().toBuffer())
  );

  // ICO file format header
  const iconCount = icoSizes.length;
  let headerSize = 6 + iconCount * 16;  // ICO header + directory entries
  let dataOffset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: 1 = ICO
  header.writeUInt16LE(iconCount, 4);  // Image count

  const entries = [];
  const offsets = [];

  for (let i = 0; i < iconCount; i++) {
    offsets.push(dataOffset);
    dataOffset += icoPngs[i].length;

    const entry = Buffer.alloc(16);
    const size = icoSizes[i];
    entry.writeUInt8(size >= 256 ? 0 : size, 0);  // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1);  // Height
    entry.writeUInt8(0, 2);  // Color palette
    entry.writeUInt8(0, 3);  // Reserved
    entry.writeUInt16LE(1, 4);  // Color planes
    entry.writeUInt16LE(32, 6);  // Bits per pixel
    entry.writeUInt32LE(icoPngs[i].length, 8);  // Image size
    entry.writeUInt32LE(offsets[i], 12);  // Image offset
    entries.push(entry);
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...icoPngs]);
  await fs.writeFile(join(iconsDir, 'icon.ico'), icoBuffer);

  // Generate icon.icns (macOS) - using PNG as placeholder
  // For real icns, you'd need a proper library, but Tauri accepts a PNG named .icns
  console.log('Generating icon.icns (as PNG)...');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(join(iconsDir, 'icon.icns'));

  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
