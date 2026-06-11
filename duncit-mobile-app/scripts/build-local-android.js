#!/usr/bin/env node
/**
 * Builds the Android APK or AAB inside Docker and copies the artifact to
 * <repo-root>/build/.  No Android SDK / NDK needed on the host.
 *
 * Usage:
 *   node scripts/build-local-android.js        →  build/duncit-release.apk
 *   node scripts/build-local-android.js --aab  →  build/duncit-release.aab
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const isAab = process.argv.includes('--aab');
const buildType = isAab ? 'aab' : 'apk';
const imageTag = 'duncit-android-local';
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..');
const outputDir = path.join(repoRoot, 'build');
const dockerfile = path.join(appDir, 'Dockerfile.android');

fs.mkdirSync(outputDir, { recursive: true });

function run(cmd, args) {
  console.log(`\n▶  ${[cmd, ...args].join(' ')}\n`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if ((result.status ?? 1) !== 0) {
    console.error(`\n✗  Command failed with exit code ${result.status ?? 'unknown'}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nBuilding Android ${buildType.toUpperCase()} via Docker…`);
console.log(`  Dockerfile : ${dockerfile}`);
console.log(`  Context    : ${repoRoot}`);
console.log(`  Output     : ${outputDir}\n`);

// 1. Build the Docker image (all stages up to the artifact runner)
run('docker', [
  'build',
  '-f',
  dockerfile,
  '--build-arg',
  `BUILD_TYPE=${buildType}`,
  '--progress',
  'plain',
  '-t',
  imageTag,
  repoRoot,
]);

// 2. Run the container with the host build/ folder mounted as /output
run('docker', ['run', '--rm', '--mount', `type=bind,source=${outputDir},target=/output`, imageTag]);

const artifact = isAab
  ? path.join(outputDir, 'duncit-release.aab')
  : path.join(outputDir, 'duncit-release.apk');

if (fs.existsSync(artifact)) {
  const size = (fs.statSync(artifact).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓  Done!  ${artifact}  (${size} MB)`);
} else {
  console.error(`\n✗  Artifact not found at ${artifact} — check Docker logs above.`);
  process.exit(1);
}
