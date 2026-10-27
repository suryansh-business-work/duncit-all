import { mediaOrganizerService } from '../../mediaOrganizer.service';
import { MediaRelocationModel } from '../../mediaRelocation.model';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { requestIdentity } from '@observability/requestIdentity';
import { logs } from '@observability/log';
import { getImagekitConfig } from '../../upload.service';
import { countOwnerDocs } from '../../mediaOrganizer.scan';
import { runTableQuery } from '@utils/table-query';

jest.mock('../../mediaRelocation.model', () => ({
  ...jest.requireActual('../../mediaRelocation.model'),
  MediaRelocationModel: { exists: jest.fn(), countDocuments: jest.fn(), aggregate: jest.fn() },
}));
jest.mock('@modules/platform/backgroundJob/backgroundJob.model', () => ({ BackgroundJobModel: { exists: jest.fn(), create: jest.fn() } }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.service', () => ({
  actorOf: jest.fn((user: { id: string }) => `actor:${user.id}`),
  toJob: jest.fn((job: { id: string }) => ({ id: job.id })),
}));
jest.mock('@observability/requestIdentity', () => ({ requestIdentity: { current: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));
jest.mock('../../upload.service', () => ({ getImagekitConfig: jest.fn() }));
jest.mock('../../mediaOrganizer.scan', () => ({ countOwnerDocs: jest.fn() }));
jest.mock('@utils/table-query', () => ({ runTableQuery: jest.fn() }));

const user = { id: 'u1' } as never;
const create = BackgroundJobModel.create as jest.Mock;

beforeEach(() => {
  (BackgroundJobModel.exists as jest.Mock).mockResolvedValue(null);
  (getImagekitConfig as jest.Mock).mockResolvedValue({ urlEndpoint: 'https://ik.imagekit.io/acme///' });
  (requestIdentity.current as jest.Mock).mockReturnValue(null);
  create.mockResolvedValue({ id: 'job1' });
});

describe('guards shared by every act', () => {
  it.each([
    ['start', () => mediaOrganizerService.start(user, false)],
    ['apply', () => mediaOrganizerService.apply(user, 'run1')],
    ['rollback', () => mediaOrganizerService.rollback(user, 'run1')],
  ])('%s refuses while another organizer job is running', async (_name, run) => {
    (BackgroundJobModel.exists as jest.Mock).mockResolvedValue({ _id: 'x' });
    await expect(run()).rejects.toMatchObject({
      message: 'The media organizer is already running — wait for it to finish or stop it first.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(BackgroundJobModel.exists).toHaveBeenCalledWith({ kind: 'MEDIA_ORGANIZE', status: 'RUNNING' });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['apply', () => mediaOrganizerService.apply(user, 'nope')],
    ['rollback', () => mediaOrganizerService.rollback(user, 'nope')],
  ])('%s refuses an unknown run', async (_name, run) => {
    (MediaRelocationModel.exists as jest.Mock).mockResolvedValue(null);
    await expect(run()).rejects.toMatchObject({ message: 'That organizer run was not found.' });
    expect(MediaRelocationModel.exists).toHaveBeenCalledWith({ run_id: 'nope' });
  });
});

describe('start', () => {
  it('launches a scan job with the normalised endpoint, the owner document total and a log line', async () => {
    (countOwnerDocs as jest.Mock).mockResolvedValue(900);
    await expect(mediaOrganizerService.start(user, false, 'https://portal/x')).resolves.toEqual({ id: 'job1' });
    const arg = create.mock.calls[0][0];
    expect(arg).toMatchObject({
      kind: 'MEDIA_ORGANIZE',
      label: 'Media organizer — scan',
      url: 'https://portal/x',
      total: 900,
      actor: 'actor:u1',
      identity: { user: 'actor:u1' },
      params: { phase: 'SCAN', dry_run: false, endpoint: 'https://ik.imagekit.io/acme', owner_index: 0 },
    });
    expect(arg.params.run_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(scheduleJob).toHaveBeenCalledWith('job1');
    expect(logs.server.info).toHaveBeenCalledWith('mediaOrganizer', 'start', expect.objectContaining({ userId: 'u1', phase: 'SCAN', dry_run: false, total: 900 }));
  });

  it('labels a dry run, keeps the request identity and trims the url', async () => {
    (countOwnerDocs as jest.Mock).mockResolvedValue(1);
    (requestIdentity.current as jest.Mock).mockReturnValue({ user: 'from-request' });
    await mediaOrganizerService.start(user, true, 'x'.repeat(2500));
    const arg = create.mock.calls[0][0];
    expect(arg.label).toBe('Media organizer — scan (dry run)');
    expect(arg.identity).toEqual({ user: 'from-request' });
    expect(arg.url).toHaveLength(2000);
    await mediaOrganizerService.start(user, true);
    expect(create.mock.calls[1][0].url).toBe('');
  });

  it('refuses when ImageKit has no URL endpoint', async () => {
    (getImagekitConfig as jest.Mock).mockResolvedValue({ urlEndpoint: '  ' });
    await expect(mediaOrganizerService.start(user, false)).rejects.toMatchObject({
      message: expect.stringContaining('ImageKit has no URL endpoint configured'),
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('apply', () => {
  it('copies a finished scan: the job total is the pending file count', async () => {
    (MediaRelocationModel.exists as jest.Mock).mockResolvedValue({ _id: 'r' });
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(30);
    await mediaOrganizerService.apply(user, 'run1');
    expect(MediaRelocationModel.countDocuments).toHaveBeenCalledWith({ run_id: 'run1', status: 'PENDING' });
    expect(create.mock.calls[0][0]).toMatchObject({
      label: 'Media organizer — copy into folders',
      total: 30,
      params: { run_id: 'run1', phase: 'APPLY', dry_run: false, endpoint: 'https://ik.imagekit.io/acme', owner_index: 0 },
    });
  });

  it('refuses a run with nothing left to copy', async () => {
    (MediaRelocationModel.exists as jest.Mock).mockResolvedValue({ _id: 'r' });
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(0);
    await expect(mediaOrganizerService.apply(user, 'run1')).rejects.toMatchObject({ message: 'That run has nothing left to copy.' });
  });
});

describe('rollback', () => {
  it('rolls back the DONE files of a run, needing no endpoint', async () => {
    (MediaRelocationModel.exists as jest.Mock).mockResolvedValue({ _id: 'r' });
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(8);
    await mediaOrganizerService.rollback(user, 'run1');
    expect(MediaRelocationModel.countDocuments).toHaveBeenCalledWith({ run_id: 'run1', status: 'DONE' });
    expect(create.mock.calls[0][0]).toMatchObject({
      label: 'Media organizer — roll back',
      total: 8,
      params: { run_id: 'run1', phase: 'ROLLBACK', endpoint: '' },
    });
    expect(getImagekitConfig).not.toHaveBeenCalled();
  });

  it('refuses a run with nothing to roll back', async () => {
    (MediaRelocationModel.exists as jest.Mock).mockResolvedValue({ _id: 'r' });
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(0);
    await expect(mediaOrganizerService.rollback(user, 'run1')).rejects.toMatchObject({ message: 'That run has nothing to roll back.' });
  });
});

describe('runs', () => {
  const at = (iso: string) => new Date(iso);

  it('folds status counts per run, newest first, keeping the earliest start', async () => {
    (MediaRelocationModel.aggregate as jest.Mock).mockResolvedValue([
      { _id: { run_id: 'old', status: 'DONE' }, count: 5, started: at('2026-01-01T00:00:00Z') },
      { _id: { run_id: 'new', status: 'PENDING' }, count: 2, started: at('2026-02-02T00:00:00Z') },
      { _id: { run_id: 'new', status: 'DONE' }, count: 7, started: at('2026-02-01T00:00:00Z') },
      { _id: { run_id: 'new', status: 'FAILED' }, count: 1, started: at('2026-02-03T00:00:00Z') },
    ]);
    const runs = await mediaOrganizerService.runs();
    expect(runs.map((r) => r.run_id)).toEqual(['new', 'old']);
    expect(runs[0]).toMatchObject({ started_at: '2026-02-01T00:00:00.000Z', PENDING: 2, DONE: 7, FAILED: 1, SHARED: 0, IN_PLACE: 0, ROLLED_BACK: 0 });
    expect(runs[1]).toMatchObject({ started_at: '2026-01-01T00:00:00.000Z', DONE: 5, PENDING: 0 });
  });

  it('limits the list', async () => {
    (MediaRelocationModel.aggregate as jest.Mock).mockResolvedValue([
      { _id: { run_id: 'a', status: 'DONE' }, count: 1, started: at('2026-01-01T00:00:00Z') },
      { _id: { run_id: 'b', status: 'DONE' }, count: 1, started: at('2026-01-02T00:00:00Z') },
    ]);
    expect((await mediaOrganizerService.runs(1)).map((r) => r.run_id)).toEqual(['b']);
  });

  it('is empty with no recorded runs', async () => {
    (MediaRelocationModel.aggregate as jest.Mock).mockResolvedValue([]);
    await expect(mediaOrganizerService.runs()).resolves.toEqual([]);
  });
});

describe('filesTable', () => {
  it('maps a run page to rows with reference and rewrite counts', async () => {
    (runTableQuery as jest.Mock).mockResolvedValue({
      docs: [
        {
          _id: { toHexString: () => 'abc' },
          file_path: '/a.jpg', new_file_path: '/b/a.jpg', target_folder: '/b', owners: ['pods/1'], status: 'DONE', error: '',
          refs: [{ rewritten: true }, { rewritten: false }, { rewritten: true }],
        },
      ],
      total: 1, page: 2, page_size: 25,
    });
    const out = await mediaOrganizerService.filesTable('run1', { page: 2 } as never);
    expect(out).toEqual({
      rows: [{ id: 'abc', file_path: '/a.jpg', new_file_path: '/b/a.jpg', target_folder: '/b', owners: ['pods/1'], status: 'DONE', error: '', references: 3, rewritten: 2 }],
      total: 1, page: 2, page_size: 25,
    });
    const [model, base, input, config, options] = (runTableQuery as jest.Mock).mock.calls[0];
    expect(model).toBe(MediaRelocationModel);
    expect(base).toEqual({ run_id: 'run1' });
    expect(input).toEqual({ page: 2 });
    expect(config.defaultSort).toEqual({ _id: 1 });
    expect(options.projection['refs.rewritten']).toBe(1);
  });
});
