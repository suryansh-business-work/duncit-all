import { dockerGet } from '../tech/tech.service';
import type { IStressContainerSample } from './stressTest.model';

/**
 * CPU and memory per running container, read over the Docker socket.
 *
 * Production and staging share one VPS, so this is the reading that shows a
 * staging run eating into production (or ClickHouse eating into both). Every
 * running container is sampled, not only the target stack's — the neighbour
 * that is starving is exactly the one a filtered list would hide.
 *
 * Docker's one-shot stats carry no previous reading, so CPU is the delta
 * against THIS module's last reading of the same container. The first sample
 * after boot therefore reads 0% for every container, which is honest: there is
 * nothing yet to compare against.
 */

interface RawContainer {
  Id: string;
  Names: string[];
}

interface RawStats {
  cpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
    online_cpus?: number;
  };
  memory_stats?: {
    usage?: number;
    limit?: number;
    stats?: { inactive_file?: number; cache?: number };
  };
}

/** How many containers a sample keeps — the busiest, which are the ones worth charting. */
const KEEP = 15;

const previous = new Map<string, { total: number; system: number }>();

function cpuPercent(id: string, stats: RawStats): number {
  const total = stats.cpu_stats?.cpu_usage?.total_usage ?? 0;
  const system = stats.cpu_stats?.system_cpu_usage ?? 0;
  const cpus = stats.cpu_stats?.online_cpus ?? 1;
  const last = previous.get(id);
  previous.set(id, { total, system });
  if (!last) return 0;
  const cpuDelta = total - last.total;
  const systemDelta = system - last.system;
  if (cpuDelta <= 0 || systemDelta <= 0) return 0;
  return Math.round((cpuDelta / systemDelta) * cpus * 1000) / 10;
}

function memory(stats: RawStats): { mb: number; pct: number } {
  const usage = stats.memory_stats?.usage ?? 0;
  // cgroup v2 reports reclaimable page cache as inactive_file, v1 as cache —
  // `docker stats` subtracts it, and so does this, or every container reads full.
  const cache = stats.memory_stats?.stats?.inactive_file ?? stats.memory_stats?.stats?.cache ?? 0;
  const used = Math.max(0, usage - cache);
  const limit = stats.memory_stats?.limit ?? 0;
  return {
    mb: Math.round(used / 1_048_576),
    pct: limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0,
  };
}

async function sampleOne(container: RawContainer): Promise<IStressContainerSample | null> {
  try {
    const stats = await dockerGet<RawStats>(
      `/containers/${encodeURIComponent(container.Id)}/stats?stream=false&one-shot=true`
    );
    const mem = memory(stats);
    return {
      name: (container.Names[0] ?? container.Id.slice(0, 12)).replace(/^\//, ''),
      cpu_pct: cpuPercent(container.Id, stats),
      memory_mb: mem.mb,
      memory_pct: mem.pct,
    };
  } catch {
    // A container that stopped between the list and its stats is not an error.
    return null;
  }
}

/** The busiest running containers right now. Empty when Docker is not reachable. */
export async function sampleContainers(): Promise<IStressContainerSample[]> {
  let list: RawContainer[];
  try {
    list = await dockerGet<RawContainer[]>('/containers/json');
  } catch {
    return [];
  }
  const samples = (await Promise.all(list.map(sampleOne))).filter(
    (s): s is IStressContainerSample => s !== null
  );
  samples.sort((a, b) => b.cpu_pct - a.cpu_pct || b.memory_mb - a.memory_mb);
  return samples.slice(0, KEEP);
}
