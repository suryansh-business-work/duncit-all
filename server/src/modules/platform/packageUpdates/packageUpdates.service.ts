/**
 * Tech-portal "Package Updates": what every `package.json` in the monorepo
 * declares, beside what npm publishes today.
 *
 * The declared side is `package-manifest.ts` — generated, because the API's
 * Docker image holds only the manifests `pnpm install` needed. The published
 * side is `npm-check-updates`, run once per sweep over the DEDUPLICATED set of
 * dependency names: 76 manifests declare ~2000 rows but only ~200 distinct
 * packages, so asking per-manifest would be ten registry round trips for every
 * one that tells us something new.
 *
 * ncu is spawned as a CLI rather than imported: it is a pure-ESM package and
 * `server/src` compiles to CommonJS, where a TypeScript `await import()` is
 * downlevelled to `require()` and throws ERR_REQUIRE_ESM. A child process has
 * no interop problem, and the JSON it prints is the whole contract.
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { logs } from '@observability/log';
import {
  PACKAGE_MANIFEST,
  type ManifestDependency,
  type ManifestDependencyKind,
  type ManifestPackage,
} from './package-manifest';

const execFileAsync = promisify(execFile);

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const NCU_TIMEOUT_MS = 60_000;
const NCU_MAX_BUFFER = 8 * 1024 * 1024;
/** A good answer ages slowly — publishing is not a per-minute event. */
const CACHE_TTL_MS = 30 * 60 * 1000;
/** A failed sweep costs a full timeout, so it is not retried on every reload. */
const ERROR_CACHE_TTL_MS = 60 * 1000;

/**
 * The version the probe manifest pins every dependency to.
 *
 * ncu reports only what it WOULD upgrade, so a dependency the repo is already
 * current on would simply be missing from the answer and we could not tell
 * "up to date" from "never asked". Pinning the probe below everything that has
 * ever been published makes ncu report the newest version of every name, and
 * the comparison against what the repo actually declares happens here.
 */
const PROBE_VERSION = '0.0.0';

/** How far behind the declared range is — MAJOR is the one that needs reading. */
export type UpdateType = 'MAJOR' | 'MINOR' | 'PATCH' | 'UP_TO_DATE' | 'INTERNAL' | 'UNKNOWN';

export interface DependencyUpdate {
  name: string;
  kind: ManifestDependencyKind;
  /** Exactly what the manifest declares. */
  range: string;
  /** Newest published version, or null when the registry was not asked. */
  latest: string | null;
  updateType: UpdateType;
}

export interface PackageUpdate {
  name: string;
  path: string;
  private: boolean;
  total: number;
  outdated: number;
  major: number;
  minor: number;
  patch: number;
  dependencies: DependencyUpdate[];
}

export interface PackageUpdatesReport {
  packages: PackageUpdate[];
  /** ISO time of the sweep, or null when the registry has never answered. */
  checkedAt: string | null;
  registry: string;
  totalPackages: number;
  totalDependencies: number;
  uniqueDependencies: number;
  outdated: number;
  major: number;
  minor: number;
  patch: number;
  error: string | null;
}

/** Ranges that resolve inside the repo — a registry has never heard of them. */
const LOCAL_RANGE = /^(?:workspace|file|link|portal|catalog):/;
/** Ranges that resolve somewhere else — an alias, a git host, a tarball URL. */
const REMOTE_RANGE = /^(?:npm|git|github|gitlab|bitbucket|https?):|^git\+/;
/** The first version-looking token in a range: `^1.2.3`, `>=4.0 <5`, `~2.1`. */
const VERSION_TOKEN = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/;
/**
 * A lower bound with nothing above it: `>=5`, `> 4.1`.
 *
 * This is how nearly every peerDependency in the repo is written, and it accepts
 * whatever npm publishes next as readily as the version it names — `@mui/material
 * >=5` is satisfied by 9.4.0. Comparing only the first version token called all
 * 218 of them a major behind, which is most of what the console reported as
 * outdated and none of it real.
 */
const OPEN_LOWER_BOUND = /^\s*>=?\s*\d/;

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

const part = (value: string | undefined): number => (value ? Number.parseInt(value, 10) : 0);

function parseVersion(range: string): Semver | null {
  const match = VERSION_TOKEN.exec(range);
  if (!match) return null;
  return { major: part(match[1]), minor: part(match[2]), patch: part(match[3]) };
}

/** True when the npm registry is the thing that could answer for this range. */
export function isRegistryRange(range: string): boolean {
  return !LOCAL_RANGE.test(range) && !REMOTE_RANGE.test(range);
}

function compareVersions(declared: Semver, latest: Semver): UpdateType {
  if (latest.major > declared.major) return 'MAJOR';
  if (latest.major < declared.major) return 'UP_TO_DATE';
  if (latest.minor > declared.minor) return 'MINOR';
  if (latest.minor < declared.minor) return 'UP_TO_DATE';
  if (latest.patch > declared.patch) return 'PATCH';
  return 'UP_TO_DATE';
}

/** True when the range names a floor and no ceiling, so nothing published is outside it. */
export function acceptsAnyNewerVersion(range: string): boolean {
  return OPEN_LOWER_BOUND.test(range) && !range.includes('<');
}

/** The classification one declared range gets against the newest published version. */
export function updateTypeOf(range: string, latest: string | null): UpdateType {
  if (LOCAL_RANGE.test(range)) return 'INTERNAL';
  if (!latest) return 'UNKNOWN';
  if (acceptsAnyNewerVersion(range)) return 'UP_TO_DATE';
  const declared = parseVersion(range);
  const published = parseVersion(latest);
  if (!declared || !published) return 'UNKNOWN';
  return compareVersions(declared, published);
}

const registryUrl = (): string => process.env.NPM_REGISTRY_URL || DEFAULT_REGISTRY;

/**
 * The distinct dependency names worth a registry lookup, across every manifest.
 */
export function registryDependencyNames(packages: readonly ManifestPackage[]): string[] {
  const names = new Set<string>();
  for (const pkg of packages) {
    for (const dep of pkg.dependencies) {
      if (isRegistryRange(dep.range)) names.add(dep.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** ncu prints its answer as one JSON object; anything around it is a banner. */
export function parseNcuOutput(stdout: string): Map<string, string> {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end < start) return new Map();
  const parsed = JSON.parse(stdout.slice(start, end + 1)) as Record<string, string>;
  return new Map(Object.entries(parsed));
}

const ncuCliPath = (): string =>
  join(dirname(require.resolve('npm-check-updates/package.json')), 'build', 'cli.js');

/**
 * One registry sweep: every distinct name asked at once, answered as
 * `name -> newest published version`.
 *
 * The probe manifest is written to a throwaway directory rather than passed on
 * the command line — 200 names is 6 KB today and Windows caps a command line
 * at 32 KB — and rather than into the repo, where ncu would find the real
 * lockfile and answer about that instead.
 */
async function fetchLatestVersions(names: readonly string[]): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();
  const dir = mkdtempSync(join(tmpdir(), 'duncit-ncu-'));
  try {
    const dependencies: Record<string, string> = {};
    for (const name of names) dependencies[name] = PROBE_VERSION;
    const probe = join(dir, 'package.json');
    const body = { name: 'duncit-registry-probe', version: PROBE_VERSION, private: true, dependencies };
    writeFileSync(probe, JSON.stringify(body), 'utf8');

    const { stdout } = await execFileAsync(
      process.execPath,
      [
        ncuCliPath(),
        '--jsonUpgraded',
        '--packageFile',
        probe,
        '--target',
        'latest',
        '--packageManager',
        'npm',
        '--registry',
        registryUrl(),
      ],
      { cwd: dir, timeout: NCU_TIMEOUT_MS, maxBuffer: NCU_MAX_BUFFER },
    );
    return parseNcuOutput(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const OUTDATED_TYPES: ReadonlySet<UpdateType> = new Set<UpdateType>(['MAJOR', 'MINOR', 'PATCH']);

interface Tally {
  outdated: number;
  major: number;
  minor: number;
  patch: number;
}

function tally(rows: readonly DependencyUpdate[]): Tally {
  const counts: Tally = { outdated: 0, major: 0, minor: 0, patch: 0 };
  for (const row of rows) {
    if (!OUTDATED_TYPES.has(row.updateType)) continue;
    counts.outdated += 1;
    if (row.updateType === 'MAJOR') counts.major += 1;
    else if (row.updateType === 'MINOR') counts.minor += 1;
    else counts.patch += 1;
  }
  return counts;
}

const toDependencyUpdate = (
  dep: ManifestDependency,
  latestByName: ReadonlyMap<string, string>,
): DependencyUpdate => {
  const latest = latestByName.get(dep.name) ?? null;
  return {
    name: dep.name,
    kind: dep.kind,
    range: dep.range,
    latest,
    updateType: updateTypeOf(dep.range, latest),
  };
};

/** The manifest + whatever the registry answered, as the shape the portal renders. */
export function buildReport(
  latestByName: ReadonlyMap<string, string>,
  checkedAt: string | null,
  error: string | null,
): PackageUpdatesReport {
  const packages = PACKAGE_MANIFEST.map((pkg) => {
    const dependencies = pkg.dependencies.map((dep) => toDependencyUpdate(dep, latestByName));
    return {
      name: pkg.name,
      path: pkg.path,
      private: pkg.private,
      total: dependencies.length,
      ...tally(dependencies),
      dependencies,
    };
  });
  const totals = tally(packages.flatMap((pkg) => pkg.dependencies));
  return {
    packages,
    checkedAt,
    registry: registryUrl(),
    totalPackages: packages.length,
    totalDependencies: packages.reduce((sum, pkg) => sum + pkg.total, 0),
    uniqueDependencies: registryDependencyNames(PACKAGE_MANIFEST).length,
    ...totals,
    error,
  };
}

let cached: PackageUpdatesReport | null = null;
let freshUntil = 0;
let inFlight: Promise<PackageUpdatesReport> | null = null;

async function sweep(): Promise<PackageUpdatesReport> {
  const names = registryDependencyNames(PACKAGE_MANIFEST);
  try {
    const latest = await fetchLatestVersions(names);
    cached = buildReport(latest, new Date().toISOString(), null);
    freshUntil = Date.now() + CACHE_TTL_MS;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.server.error('packageUpdates', 'sweep', { error: err, names: names.length });
    cached = buildReport(new Map(), null, message);
    freshUntil = Date.now() + ERROR_CACHE_TTL_MS;
  }
  return cached;
}

export const packageUpdatesService = {
  /**
   * The report, from cache when it is still fresh.
   *
   * Concurrent callers share ONE sweep: the console is opened by a handful of
   * operators at a time and every one of them would otherwise start their own
   * pass over the whole registry.
   */
  async report(force = false): Promise<PackageUpdatesReport> {
    if (!force && cached && Date.now() < freshUntil) return cached;
    inFlight ??= sweep().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },
};
