#!/usr/bin/env node
/**
 * iOS release build.
 *
 *   npm run build:local:ios
 *
 * - On macOS: runs the build LOCALLY via `eas build --local` (needs Xcode).
 * - On Windows/Linux: a local iOS build is technically impossible (Apple only
 *   ships the iOS toolchain with Xcode on macOS), so this falls back to an
 *   EAS CLOUD build — zero load on this PC; the .ipa lands on expo.dev.
 */
const { spawnSync } = require('node:child_process');

const isMac = process.platform === 'darwin';
const args = ['eas', 'build', '--platform', 'ios', '--profile', 'production'];
if (isMac) args.push('--local');

if (!isMac) {
  console.log('\nℹ  iOS builds need Xcode, which only exists on macOS.');
  console.log('   Building in the EAS cloud instead — nothing heavy runs on this PC.');
  console.log('   Track progress + download the .ipa at https://expo.dev\n');
} else {
  console.log('\nBuilding iOS locally via eas build --local (Xcode required)…\n');
}

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
