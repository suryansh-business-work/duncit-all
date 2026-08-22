import { gql } from '@apollo/client';

/**
 * Every `package.json` in the repo against what npm publishes today.
 *
 * The server holds the manifest list as generated data (its Docker image only
 * ever copies a third of the tree) and asks the registry once per sweep, so
 * this is a single read of an already-collated report rather than a table page.
 */
export const PACKAGE_UPDATES = gql`
  query TechPackageUpdates {
    techPackageUpdates {
      checkedAt
      registry
      totalPackages
      totalDependencies
      uniqueDependencies
      outdated
      major
      minor
      patch
      error
      packages {
        name
        path
        private
        total
        outdated
        major
        minor
        patch
        dependencies {
          name
          kind
          range
          latest
          updateType
        }
      }
    }
  }
`;

/**
 * Re-ask the registry now. It answers with the same report, but the page reads
 * it back through the query above so one cache entry stays the single source —
 * two documents returning an un-normalisable payload would drift.
 */
export const REFRESH_PACKAGE_UPDATES = gql`
  mutation TechRefreshPackageUpdates {
    techRefreshPackageUpdates {
      checkedAt
      error
    }
  }
`;

export type UpdateType = 'MAJOR' | 'MINOR' | 'PATCH' | 'UP_TO_DATE' | 'INTERNAL' | 'UNKNOWN';

export type DependencyKind =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

export interface DependencyUpdate {
  name: string;
  kind: DependencyKind;
  range: string;
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
  packages: PackageUpdate[];
}

type Translate = (key: string) => string;

export type ChipColor = 'error' | 'warning' | 'info' | 'success' | 'default';

/**
 * The update vocabulary as VALUE + KEY pairs, written out rather than composed:
 * the localization gate reads literal keys and seeds only what it can see.
 */
const UPDATE_TYPE_KEYS: ReadonlyArray<{ value: UpdateType; key: string }> = [
  { value: 'MAJOR', key: 'tech.packageUpdates.major' },
  { value: 'MINOR', key: 'tech.packageUpdates.minor' },
  { value: 'PATCH', key: 'tech.packageUpdates.patch' },
  { value: 'UP_TO_DATE', key: 'tech.packageUpdates.upToDate' },
  { value: 'INTERNAL', key: 'tech.packageUpdates.internal' },
  { value: 'UNKNOWN', key: 'tech.packageUpdates.unknown' },
];

const UPDATE_TYPE_LABEL_KEY = new Map(UPDATE_TYPE_KEYS.map((row) => [row.value, row.key]));

export const updateTypeLabel = (t: Translate, type: UpdateType) =>
  t(UPDATE_TYPE_LABEL_KEY.get(type) ?? 'tech.packageUpdates.unknown');

export const updateTypeOptions = (t: Translate) =>
  UPDATE_TYPE_KEYS.map((row) => ({ value: row.value, label: t(row.key) }));

/** A breaking bump shouts, a patch is informational, the rest go quiet. */
export const UPDATE_TYPE_COLOR: Record<UpdateType, ChipColor> = {
  MAJOR: 'error',
  MINOR: 'warning',
  PATCH: 'info',
  UP_TO_DATE: 'success',
  INTERNAL: 'default',
  UNKNOWN: 'default',
};

/** How loudly a row asks to be read — the order both tables sort by. */
const UPDATE_TYPE_RANK: Record<UpdateType, number> = {
  MAJOR: 5,
  MINOR: 4,
  PATCH: 3,
  UNKNOWN: 2,
  UP_TO_DATE: 1,
  INTERNAL: 0,
};

/** The kind of dependency, as the block it was declared in. */
const KIND_KEYS: ReadonlyArray<{ value: DependencyKind; key: string }> = [
  { value: 'dependencies', key: 'tech.packageUpdates.kindRuntime' },
  { value: 'devDependencies', key: 'tech.packageUpdates.kindDev' },
  { value: 'peerDependencies', key: 'tech.packageUpdates.kindPeer' },
  { value: 'optionalDependencies', key: 'tech.packageUpdates.kindOptional' },
];

const KIND_LABEL_KEY = new Map(KIND_KEYS.map((row) => [row.value, row.key]));

export const kindLabel = (t: Translate, kind: DependencyKind) =>
  t(KIND_LABEL_KEY.get(kind) ?? 'tech.packageUpdates.kindRuntime');

/** Worst first, then alphabetical — the reading order of every list here. */
export function compareBySeverity(
  a: { updateType: UpdateType; name: string },
  b: { updateType: UpdateType; name: string },
): number {
  const bySeverity = UPDATE_TYPE_RANK[b.updateType] - UPDATE_TYPE_RANK[a.updateType];
  if (bySeverity !== 0) return bySeverity;
  return a.name.localeCompare(b.name);
}

/** One dependency NAME across every manifest that declares it. */
export interface DependencyGroup {
  name: string;
  latest: string | null;
  /** The worst classification any manifest's range earns. */
  updateType: UpdateType;
  /** Every distinct range declared for it — more than one is repo-wide drift. */
  ranges: string;
  usedIn: number;
  /** The manifests, one per line, for the row's tooltip. */
  paths: string;
}

interface GroupAccumulator {
  latest: string | null;
  updateType: UpdateType;
  ranges: Set<string>;
  paths: string[];
}

function collect(packages: readonly PackageUpdate[]): Map<string, GroupAccumulator> {
  const byName = new Map<string, GroupAccumulator>();
  for (const pkg of packages) {
    for (const dep of pkg.dependencies) {
      const entry = byName.get(dep.name);
      if (!entry) {
        byName.set(dep.name, {
          latest: dep.latest,
          updateType: dep.updateType,
          ranges: new Set([dep.range]),
          paths: [pkg.path],
        });
        continue;
      }
      entry.ranges.add(dep.range);
      entry.paths.push(pkg.path);
      entry.latest ??= dep.latest;
      if (UPDATE_TYPE_RANK[dep.updateType] > UPDATE_TYPE_RANK[entry.updateType]) {
        entry.updateType = dep.updateType;
      }
    }
  }
  return byName;
}

/**
 * The repo-wide view: one row per dependency name.
 *
 * Two manifests pinning the same package to different ranges is the drift rule
 * 34 exists to catch, so the ranges are kept as a set rather than collapsed to
 * the first one seen.
 */
export function groupDependencies(packages: readonly PackageUpdate[]): DependencyGroup[] {
  return [...collect(packages)]
    .map(([name, entry]) => ({
      name,
      latest: entry.latest,
      updateType: entry.updateType,
      ranges: [...entry.ranges].sort((a, b) => a.localeCompare(b)).join(', '),
      usedIn: entry.paths.length,
      paths: entry.paths.join('\n'),
    }))
    .sort(compareBySeverity);
}

export const packageSearchText = (pkg: PackageUpdate) => `${pkg.name} ${pkg.path}`;

export const dependencySearchText = (group: DependencyGroup) =>
  `${group.name} ${group.ranges} ${group.latest ?? ''}`;

export const dependencyRowSearchText = (dep: DependencyUpdate) =>
  `${dep.name} ${dep.range} ${dep.latest ?? ''}`;
