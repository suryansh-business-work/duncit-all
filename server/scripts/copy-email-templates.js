// Copy non-TypeScript email assets (the MJML templates) into dist after `tsc`.
//
// `tsc` only emits `.js` from `src`, so the `.mjml` files under
// src/services/email/templates never reach dist. In production (`node dist/...`)
// the disk fallback in email.service / emailTemplate.service then ENOENTs on the
// missing template (e.g. `password-reset-otp.mjml`). Copying them here keeps the
// on-disk fallback working in the deployed image; dev (ts-node-dev on src) is
// unaffected. No external dependency — plain Node fs only.
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src', 'services', 'email', 'templates');
const destDir = path.join(__dirname, '..', 'dist', 'services', 'email', 'templates');

function copyMjml() {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[copy-email-templates] source dir not found: ${srcDir}`);
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.mjml'));
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
  console.log(`[copy-email-templates] copied ${files.length} .mjml templates to dist`);
}

// Copy bundled brand assets (PDF logo mark, etc.) into dist for the same reason
// — tsc emits only .js, so the .png under src/services/_assets never reaches
// dist and the invoice/ticket PDF generators would ENOENT on `node dist/...`.
function copyBrandAssets() {
  const src = path.join(__dirname, '..', 'src', 'services', '_assets');
  const dest = path.join(__dirname, '..', 'dist', 'services', '_assets');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => /\.(png|jpe?g|svg)$/i.test(f));
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  console.log(`[copy-email-templates] copied ${files.length} brand assets to dist`);
}

copyMjml();
copyBrandAssets();
