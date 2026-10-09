import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { actorOf, toJob } from '@modules/platform/backgroundJob/backgroundJob.service';
import { getImagekitConfig } from './upload.service';
import { normalizeEndpoint } from './mediaUrl';
import { countOwnerDocs } from './mediaOrganizer.scan';
import type { MediaOrganizeParams, MediaOrganizePhase } from './mediaOrganizer.params';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  MediaRelocationModel,
  RELOCATION_STATUSES,
  type LeanMediaRelocation,
  type RelocationStatus,
} from './mediaRelocation.model';

/**
 * Tidy the ImageKit library into per-owner folders, as a background job.
 *
 * Three acts, each its own job so each shows in the header with its own
 * progress: scan (optionally stopping there — a dry run), apply (copy and
 * rewrite), and rollback (point a run's rewritten fields back at the
 * originals). Only one organizer job runs at a time: two scans of one library
 * would copy the same files twice.
 */

export const MEDIA_ORGANIZER_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER'];

const FILES_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['file_path', 'new_file_path', 'owners', 'error'],
  sortFields: { file_path: 'file_path', status: 'status', target_folder: 'target_folder' },
  filterFields: {
    status: { type: 'enum' },
    file_path: { type: 'string' },
    target_folder: { type: 'string' },
  },
  defaultSort: { _id: 1 },
};

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

async function assertIdle(): Promise<void> {
  if (await BackgroundJobModel.exists({ kind: 'MEDIA_ORGANIZE', status: 'RUNNING' })) {
    throw badInput('The media organizer is already running — wait for it to finish or stop it first.');
  }
}

async function currentEndpoint(): Promise<string> {
  const endpoint = normalizeEndpoint((await getImagekitConfig()).urlEndpoint);
  if (!endpoint) throw badInput('ImageKit has no URL endpoint configured (Tech portal → Environment Variables → ImageKit).');
  return endpoint;
}

const LABELS: Record<MediaOrganizePhase, string> = {
  SCAN: 'Media organizer — scan',
  APPLY: 'Media organizer — copy into folders',
  ROLLBACK: 'Media organizer — roll back',
};

async function launch(user: AuthUser, params: MediaOrganizeParams, total: number, url?: string | null) {
  const actor = actorOf(user);
  const job = await BackgroundJobModel.create({
    kind: 'MEDIA_ORGANIZE',
    label: params.dry_run ? `${LABELS.SCAN} (dry run)` : LABELS[params.phase],
    url: (url ?? '').slice(0, 2000),
    params,
    total,
    actor,
    identity: requestIdentity.current() ?? { user: actor },
  });
  // Rewriting stored URLs across the database is an admin act worth a line of its own.
  logs.server.info('mediaOrganizer', 'start', { userId: user.id, run_id: params.run_id, phase: params.phase, dry_run: params.dry_run, total });
  scheduleJob(job.id);
  return toJob(job);
}

async function runExists(runId: string): Promise<void> {
  if (!(await MediaRelocationModel.exists({ run_id: runId }))) throw badInput('That organizer run was not found.');
}

export const mediaOrganizerService = {
  /** Scan the library; unless it is a dry run, copy and rewrite straight after. */
  async start(user: AuthUser, dryRun: boolean, url?: string | null) {
    await assertIdle();
    const params: MediaOrganizeParams = { run_id: randomUUID(), phase: 'SCAN', dry_run: dryRun, endpoint: await currentEndpoint(), owner_index: 0 };
    return launch(user, params, await countOwnerDocs(), url);
  },

  /** Carry out a dry run's findings without scanning again. */
  async apply(user: AuthUser, runId: string, url?: string | null) {
    await assertIdle();
    await runExists(runId);
    const pending = await MediaRelocationModel.countDocuments({ run_id: runId, status: 'PENDING' });
    if (pending === 0) throw badInput('That run has nothing left to copy.');
    const params: MediaOrganizeParams = { run_id: runId, phase: 'APPLY', dry_run: false, endpoint: await currentEndpoint(), owner_index: 0 };
    return launch(user, params, pending, url);
  },

  /** Point every field a run rewrote back at the original file. */
  async rollback(user: AuthUser, runId: string, url?: string | null) {
    await assertIdle();
    await runExists(runId);
    const done = await MediaRelocationModel.countDocuments({ run_id: runId, status: 'DONE' });
    if (done === 0) throw badInput('That run has nothing to roll back.');
    const params: MediaOrganizeParams = { run_id: runId, phase: 'ROLLBACK', dry_run: false, endpoint: '', owner_index: 0 };
    return launch(user, params, done, url);
  },

  /** Every run, newest first, with how many files ended in each state. */
  async runs(limit = 20) {
    const grouped: Array<{ _id: { run_id: string; status: RelocationStatus }; count: number; started: Date }> =
      await MediaRelocationModel.aggregate([
        { $group: { _id: { run_id: '$run_id', status: '$status' }, count: { $sum: 1 }, started: { $min: '$created_at' } } },
      ]);
    const byRun = new Map<string, { run_id: string; started_at: Date; counts: Record<RelocationStatus, number> }>();
    for (const row of grouped) {
      const run = byRun.get(row._id.run_id) ?? {
        run_id: row._id.run_id,
        started_at: row.started,
        counts: Object.fromEntries(RELOCATION_STATUSES.map((status) => [status, 0])) as Record<RelocationStatus, number>,
      };
      run.counts[row._id.status] = row.count;
      if (row.started < run.started_at) run.started_at = row.started;
      byRun.set(row._id.run_id, run);
    }
    return [...byRun.values()]
      .sort((a, b) => b.started_at.getTime() - a.started_at.getTime())
      .slice(0, limit)
      .map((run) => ({ run_id: run.run_id, started_at: run.started_at.toISOString(), ...run.counts }));
  },

  /** One run's files as a portal table page — search, status filter, sort. */
  async filesTable(runId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<LeanMediaRelocation>(
      MediaRelocationModel,
      { run_id: runId },
      input,
      FILES_TABLE_CONFIG,
      { projection: { file_path: 1, new_file_path: 1, target_folder: 1, owners: 1, status: 1, error: 1, 'refs.rewritten': 1 } }
    );
    const rows = docs.map((row) => ({
      id: row._id.toHexString(),
      file_path: row.file_path,
      new_file_path: row.new_file_path,
      target_folder: row.target_folder,
      owners: row.owners,
      status: row.status,
      error: row.error,
      references: row.refs.length,
      rewritten: row.refs.filter((ref) => ref.rewritten).length,
    }));
    return { rows, total, page, page_size };
  },
};
