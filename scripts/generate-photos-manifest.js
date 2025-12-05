import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_PHOTOS_DIR = path.join(__dirname, '..', 'public', 'photos');
const SOURCE_PHOTOS_DIR = path.join(__dirname, '..', 'photos');
const MANIFEST_FILE = path.join(PUBLIC_PHOTOS_DIR, 'manifest.json');

const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function generateManifest() {
  if (!fs.existsSync(PUBLIC_PHOTOS_DIR)) {
    fs.mkdirSync(PUBLIC_PHOTOS_DIR, { recursive: true });
  }

  // Copy any supported images from top-level "photos" into "public/photos"
  if (fs.existsSync(SOURCE_PHOTOS_DIR)) {
    const sourceFiles = fs.readdirSync(SOURCE_PHOTOS_DIR);
    for (const file of sourceFiles) {
      const ext = path.extname(file).toLowerCase();
      if (!SUPPORTED_EXTS.includes(ext)) continue;

      const src = path.join(SOURCE_PHOTOS_DIR, file);
      const dest = path.join(PUBLIC_PHOTOS_DIR, file);
      try {
        fs.copyFileSync(src, dest);
      } catch {
        // Ignore copy errors for individual files
      }
    }
  }

  const files = fs.readdirSync(PUBLIC_PHOTOS_DIR);

  const photos = files
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTS.includes(ext);
    })
    .sort()
    .map((file) => `/photos/${file}`);

  const manifest = {
    photos,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`✓ Generated photo manifest with ${photos.length} item(s) at public/photos/manifest.json`);
}

try {
  generateManifest();
} catch (err) {
  console.error('✗ Failed to generate photo manifest:', err);
  process.exit(1);
}
