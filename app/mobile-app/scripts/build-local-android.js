#!/usr/bin/env node
/**
 * Builds the Android APK or AAB inside Docker and copies the artifact to
 * <repo-root>/build/.  No Android SDK / NDK needed on the host.
 *
 * Usage:
 *   node scripts/build-local-android.js        →  build/duncit-<date>-build-<n> V<version>.apk
 *   node scripts/build-local-android.js --aab  →  build/duncit-<date>-build-<n> V<version>.aab
 *
 *   e.g.  build/duncit-18-july-2026-build-1 V1.4.18.apk
 *   <date>    local build date, e.g. 18-july-2026
 *   <n>       that day's build counter (persisted in build/.build-number.json,
 *             resets to 1 when the day rolls over)
 *   <version> app.json expo.version
 *
 * The build is throttled + monitored so it cannot take the PC down:
 *   - Gradle runs with --build-arg GRADLE_WORKERS / GRADLE_HEAP (defaults 4 / 3g,
 *     override via env of the same names) instead of saturating every core.
 *   - The WSL2 VM itself is capped via ~/.wslconfig (memory/processors).
 *   - While building, host CPU load + free RAM are sampled every 10s, printed,
 *     and appended to <repo-root>/build/build-monitor.log. If free RAM falls
 *     below the abort threshold the build is cancelled gracefully — better a
 *     failed build than a hard power-off.
 *
 * Env knobs:
 *   GRADLE_WORKERS=4           parallel Gradle workers inside Docker
 *   GRADLE_HEAP=3g             main Gradle daemon JVM heap
 *   GRADLE_WORKER_HEAP=1g      per-JVM heap for forked workers (kept small — several
 *                              run in parallel, so this is what pressures the RAM cap)
 *   MONITOR_WARN_FREE_MB=3000  warn below this much free host RAM
 *   MONITOR_ABORT_FREE_MB=1500 cancel the build below this much free host RAM
 */
const { spawn, execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { notifyReleaseSafe } = require('./release-notify');

const isAab = process.argv.includes('--aab');
const buildType = isAab ? 'aab' : 'apk';
const imageTag = 'duncit-android-local';
const appDir = path.resolve(__dirname, '..');
// app/mobile-app → repo root is TWO levels up (post monorepo restructure).
const repoRoot = path.resolve(appDir, '..', '..');
const outputDir = path.join(repoRoot, 'build');
const dockerfile = path.join(appDir, 'Dockerfile.android');
const monitorLog = path.join(outputDir, 'build-monitor.log');

const gradleWorkers = process.env.GRADLE_WORKERS || '4';
const gradleHeap = process.env.GRADLE_HEAP || '3g';
const gradleWorkerHeap = process.env.GRADLE_WORKER_HEAP || '1g';
const warnFreeMb = Number(process.env.MONITOR_WARN_FREE_MB || 3000);
const abortFreeMb = Number(process.env.MONITOR_ABORT_FREE_MB || 1500);
const SAMPLE_MS = 10_000;

fs.mkdirSync(outputDir, { recursive: true });

/* ── System monitor ───────────────────────────────────────────────────────── */

/** Host CPU load % — Windows via CIM, elsewhere via 1-min loadavg. */
function sampleCpu() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile(
        'powershell',
        ['-NoProfile', '-Command', '(Get-CimInstance Win32_Processor).LoadPercentage'],
        { timeout: 8000 },
        (err, stdout) => resolve(err ? -1 : Number.parseInt(stdout, 10) || 0),
      );
    } else {
      resolve(Math.round((os.loadavg()[0] / os.cpus().length) * 100));
    }
  });
}

function startMonitor(onDanger) {
  fs.appendFileSync(monitorLog, `\n=== ${new Date().toISOString()} ${buildType} build start ===\n`);
  let lowSamples = 0;
  const timer = setInterval(async () => {
    const freeMb = Math.round(os.freemem() / 1024 / 1024);
    const cpu = await sampleCpu();
    const stamp = new Date().toLocaleTimeString();
    let level = 'ok';
    if (freeMb < abortFreeMb) {
      lowSamples += 1;
      level = 'DANGER';
    } else {
      lowSamples = 0;
      if (freeMb < warnFreeMb) level = 'warn';
    }
    const line = `[monitor ${stamp}] cpu=${cpu}% freeRAM=${(freeMb / 1024).toFixed(1)}GB ${level}`;
    console.log(line);
    fs.appendFileSync(monitorLog, line + '\n');

    if (level === 'warn') {
      console.warn('  ⚠ host RAM is getting low — close heavy apps (browser tabs, IDE windows).');
    }
    // Two consecutive danger samples → cancel before Windows OOMs / powers off.
    if (lowSamples >= 2) {
      const msg = `  ✗ free RAM under ${abortFreeMb}MB twice in a row — cancelling the build to protect the PC.`;
      console.error(msg);
      fs.appendFileSync(monitorLog, msg + '\n');
      onDanger();
    }
  }, SAMPLE_MS);
  timer.unref();
  return () => clearInterval(timer);
}

/* ── Build steps ──────────────────────────────────────────────────────────── */

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶  ${[cmd, ...args].join(' ')}\n`);
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    let aborted = false;
    const stopMonitor = startMonitor(() => {
      aborted = true;
      child.kill('SIGTERM');
    });
    child.on('exit', (code) => {
      stopMonitor();
      if (aborted) {
        reject(new Error('Build cancelled by the resource monitor (host RAM critically low).'));
      } else if ((code ?? 1) === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code ?? 'unknown'}`));
      }
    });
    child.on('error', (err) => {
      stopMonitor();
      reject(err);
    });
  });
}

/* ── Artifact naming ──────────────────────────────────────────────────────── */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Local build date as `18-july-2026` (no leading zero on the day). */
function buildDateStamp(now) {
  return `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}

/** App marketing version (e.g. `1.4.18`) from app.json. */
function readAppVersion() {
  const appJson = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8'));
  return appJson.expo.version;
}

/**
 * Next per-day build number, persisted in build/.build-number.json. Resets to 1
 * when the day rolls over, and skips past any number whose file already exists
 * (so a lost/stale state file can never overwrite a previous artifact).
 */
function nextBuildNumber(stateFile, dateStamp, pathForNumber) {
  let n = 1;
  try {
    const prev = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (prev.date === dateStamp) {
      n = Number(prev.n) + 1;
    }
  } catch {
    // No (or unreadable) state yet → start today's numbering at 1.
  }
  while (fs.existsSync(pathForNumber(n))) {
    n += 1;
  }
  fs.writeFileSync(stateFile, JSON.stringify({ date: dateStamp, n }));
  return n;
}

/**
 * Rename build/duncit-release.<ext> to the dated, versioned, numbered name and
 * return the final absolute path.
 */
function renameArtifact(genericPath) {
  const version = readAppVersion();
  const dateStamp = buildDateStamp(new Date());
  const pathForNumber = (n) =>
    path.join(outputDir, `duncit-${dateStamp}-build-${n} V${version}.${buildType}`);
  const stateFile = path.join(outputDir, '.build-number.json');
  const finalPath = pathForNumber(nextBuildNumber(stateFile, dateStamp, pathForNumber));
  fs.renameSync(genericPath, finalPath);
  return finalPath;
}

async function main() {
  console.log(`\nBuilding Android ${buildType.toUpperCase()} via Docker…`);
  console.log(`  Dockerfile : ${dockerfile}`);
  console.log(`  Context    : ${repoRoot}`);
  console.log(`  Output     : ${outputDir}`);
  console.log(
    `  Throttle   : ${gradleWorkers} gradle workers · ${gradleHeap} daemon heap · ${gradleWorkerHeap} worker heap`,
  );
  console.log(`  Monitor    : warn <${warnFreeMb}MB free · abort <${abortFreeMb}MB free (${monitorLog})\n`);

  // 1. Build the Docker image (all stages up to the artifact runner)
  await run('docker', [
    'build',
    '-f', dockerfile,
    '--build-arg', `BUILD_TYPE=${buildType}`,
    '--build-arg', `GRADLE_WORKERS=${gradleWorkers}`,
    '--build-arg', `GRADLE_HEAP=${gradleHeap}`,
    '--build-arg', `GRADLE_WORKER_HEAP=${gradleWorkerHeap}`,
    '--progress', 'plain',
    '-t', imageTag,
    repoRoot,
  ]);

  // 2. Run the container with the host build/ folder mounted as /output
  await run('docker', [
    'run', '--rm',
    '--mount', `type=bind,source=${outputDir},target=/output`,
    imageTag,
  ]);

  const artifact = path.join(outputDir, `duncit-release.${buildType}`);
  if (!fs.existsSync(artifact)) {
    console.error(`\n✗  Artifact not found at ${artifact} — check Docker logs above.`);
    process.exit(1);
  }

  const finalPath = renameArtifact(artifact);
  const size = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓  Done!  ${finalPath}  (${size} MB)`);

  // Email the release list a changelog + APK download link. APK-only, best-effort
  // (never fails the build) and skippable with --no-notify.
  if (!isAab && !process.argv.includes('--no-notify')) {
    await notifyReleaseSafe({
      apkPath: finalPath,
      version: readAppVersion(),
      buildName: path.basename(finalPath).replace(/\.apk$/i, ''),
    });
  }
}

if (require.main === module) {
  main().catch((err) => {
    // Killing the docker CLI disconnects the client, which cancels the BuildKit
    // job server-side — completed layers stay cached for the next attempt.
    console.error(`\n✗  ${err.message}`);
    process.exit(1);
  });
}

module.exports = { buildDateStamp, readAppVersion, nextBuildNumber };
