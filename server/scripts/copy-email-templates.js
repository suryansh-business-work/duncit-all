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

copyMjml();
