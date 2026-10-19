// Copy bundled brand assets (PDF logo mark, etc.) into dist after `tsc`.
//
// `tsc` emits only .js, so the .png under src/services/_assets never reaches
// dist and the invoice/ticket PDF generators would ENOENT on `node dist/...`.
// The poster's embedded typeface (.woff) travels with its licence text (.txt).
// Email templates are NOT copied: they are code in services/email/catalogue
// and live in the database once seeded (rule 28 — no .mjml files).
// No external dependency — plain Node fs only.
const fs = require('node:fs');
const path = require('node:path');

function copyBrandAssets(folder) {
  const src = path.join(__dirname, '..', 'src', 'services', '_assets', folder);
  const dest = path.join(__dirname, '..', 'dist', 'services', '_assets', folder);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => /\.(png|jpe?g|svg|woff|txt)$/i.test(f));
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  console.log(`[copy-assets] copied ${files.length} assets to dist/services/_assets/${folder}`);
}

copyBrandAssets('');
// The email icons, served at /email-assets (services/email/emailAssets.router.ts).
copyBrandAssets('email-icons');
