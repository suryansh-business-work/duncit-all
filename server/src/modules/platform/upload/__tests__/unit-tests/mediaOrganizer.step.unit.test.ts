import { organizeMediaStep } from '../../mediaOrganizer.step';
import { scanBatch } from '../../mediaOrganizer.scan';
import { applyBatch, rollbackBatch } from '../../mediaOrganizer.apply';
import { MEDIA_OWNERS } from '../../mediaOrganizer.registry';
import { MediaRelocationModel } from '../../mediaRelocation.model';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';

jest.mock('../../mediaOrganizer.scan', () => ({ scanBatch: jest.fn() }));
jest.mock('../../mediaOrganizer.apply', () => ({ applyBatch: jest.fn(), rollbackBatch: jest.fn() }));
jest.mock('../../mediaRelocation.model', () => ({ MediaRelocationModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.model', () => ({ BackgroundJobModel: { updateOne: jest.fn() } }));

const params = (over: Record<string, unknown> = {}) => ({
  run_id: 'run1', phase: 'SCAN', dry_run: false, endpoint: 'https://ik.imagekit.io/acme', owner_index: 0, ...over,
});
const job = (p: unknown, over: Record<string, unknown> = {}) => ({ _id: 'j1', params: p, cursor: null, ...over }) as never;
const update = BackgroundJobModel.updateOne as jest.Mock;

describe('organizeMediaStep: settings', () => {
  it.each([[undefined], [null], ['text'], [{}], [{ phase: 'NOPE' }]])('fails a job whose params are %p', async (p) => {
    await expect(organizeMediaStep(job(p))).rejects.toThrow('This media organizer job is missing its settings.');
  });
});

describe('organizeMediaStep: SCAN', () => {
  it('scans the next batch and stays on the owner while the cursor continues', async () => {
    (scanBatch as jest.Mock).mockResolvedValue({ read: 200, cursor: 'c9' });
    await expect(organizeMediaStep(job(params({ owner_index: 2 }), { cursor: 'c1' }))).resolves.toBe(true);
    expect(scanBatch).toHaveBeenCalledWith('run1', 'https://ik.imagekit.io/acme', 2, 'c1');
    expect(update).toHaveBeenCalledWith({ _id: 'j1' }, { $set: { cursor: 'c9', 'params.owner_index': 2 }, $inc: { succeeded: 200 } });
  });

  it('moves to the next owner collection when the current one is done', async () => {
    (scanBatch as jest.Mock).mockResolvedValue({ read: 3, cursor: null });
    await organizeMediaStep(job(params({ owner_index: 2 })));
    expect(update).toHaveBeenCalledWith({ _id: 'j1' }, { $set: { cursor: null, 'params.owner_index': 3 }, $inc: { succeeded: 3 } });
  });

  it('ends a dry run once every owner collection has been walked', async () => {
    await expect(organizeMediaStep(job(params({ owner_index: MEDIA_OWNERS.length, dry_run: true })))).resolves.toBe(false);
    expect(scanBatch).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('turns a finished scan into the apply phase with the pending files as the new total', async () => {
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(42);
    await expect(organizeMediaStep(job(params({ owner_index: MEDIA_OWNERS.length })))).resolves.toBe(true);
    expect(MediaRelocationModel.countDocuments).toHaveBeenCalledWith({ run_id: 'run1', status: 'PENDING' });
    expect(update).toHaveBeenCalledWith(
      { _id: 'j1' },
      { $set: { 'params.phase': 'APPLY', total: 42, succeeded: 0, failed: 0, cursor: null } }
    );
  });

  it('finishes when the scan found nothing to copy', async () => {
    (MediaRelocationModel.countDocuments as jest.Mock).mockResolvedValue(0);
    await expect(organizeMediaStep(job(params({ owner_index: MEDIA_OWNERS.length })))).resolves.toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe('organizeMediaStep: APPLY and ROLLBACK', () => {
  it('counts the copied and failed files and reports whether more remain', async () => {
    (applyBatch as jest.Mock).mockResolvedValue({ done: 3, failed: 1, more: true });
    await expect(organizeMediaStep(job(params({ phase: 'APPLY' })))).resolves.toBe(true);
    expect(applyBatch).toHaveBeenCalledWith('run1', 'https://ik.imagekit.io/acme');
    expect(update).toHaveBeenCalledWith({ _id: 'j1' }, { $inc: { succeeded: 3, failed: 1 } });
    (applyBatch as jest.Mock).mockResolvedValue({ done: 0, failed: 0, more: false });
    await expect(organizeMediaStep(job(params({ phase: 'APPLY' })))).resolves.toBe(false);
  });

  it('rolls back a batch and reports whether more remain', async () => {
    (rollbackBatch as jest.Mock).mockResolvedValue({ done: 25, more: true });
    await expect(organizeMediaStep(job(params({ phase: 'ROLLBACK' })))).resolves.toBe(true);
    expect(rollbackBatch).toHaveBeenCalledWith('run1');
    expect(update).toHaveBeenCalledWith({ _id: 'j1' }, { $inc: { succeeded: 25 } });
    (rollbackBatch as jest.Mock).mockResolvedValue({ done: 2, more: false });
    await expect(organizeMediaStep(job(params({ phase: 'ROLLBACK' })))).resolves.toBe(false);
  });
});
