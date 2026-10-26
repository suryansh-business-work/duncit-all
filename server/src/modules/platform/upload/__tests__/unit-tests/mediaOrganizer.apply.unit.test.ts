import mongoose, { Types } from 'mongoose';
import { APPLY_BATCH, applyBatch, rollbackBatch } from '../../mediaOrganizer.apply';
import { mediaLibraryService } from '../../mediaLibrary.service';
import { MediaRelocationModel } from '../../mediaRelocation.model';
import { logs } from '@observability/log';

jest.mock('../../mediaLibrary.service', () => ({ mediaLibraryService: { createFolder: jest.fn(), list: jest.fn(), copy: jest.fn() } }));
jest.mock('../../mediaRelocation.model', () => ({ MediaRelocationModel: { find: jest.fn(), updateOne: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const ENDPOINT = 'https://ik.imagekit.io/acme';
const library = mediaLibraryService as jest.Mocked<typeof mediaLibraryService>;
const rowUpdate = MediaRelocationModel.updateOne as jest.Mock;

const queue = (rows: unknown[]) =>
  (MediaRelocationModel.find as jest.Mock).mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(rows) }) }) });

let folderSeq = 0;
/** A PENDING row with a unique target folder (ensureFolder remembers folders per process). */
function row(over: Record<string, unknown> = {}) {
  folderSeq += 1;
  return {
    _id: `row${folderSeq}`,
    run_id: 'run1',
    file_path: '/old/pic.jpg',
    target_folder: `/production/pods/p${folderSeq}/media`,
    refs: [],
    ...over,
  };
}
const statusOf = (rowId: string) =>
  rowUpdate.mock.calls.filter((c) => c[0]._id === rowId).map((c) => c[1].$set);

const modelsAdded: string[] = [];
function registerModel(name: string, modifiedCount: number) {
  const updateOne = jest.fn().mockResolvedValue({ modifiedCount });
  (mongoose.models as Record<string, unknown>)[name] = { collection: { updateOne } };
  modelsAdded.push(name);
  return updateOne;
}
afterEach(() => {
  for (const name of modelsAdded.splice(0)) delete (mongoose.models as Record<string, unknown>)[name];
});

beforeEach(() => {
  library.createFolder.mockResolvedValue(undefined);
  library.copy.mockResolvedValue(undefined);
  library.list.mockResolvedValue([]);
});

describe('applyBatch', () => {
  it('takes the next PENDING files in order, up to the batch size', async () => {
    queue([]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 0, failed: 0, more: false });
    expect(MediaRelocationModel.find).toHaveBeenCalledWith({ run_id: 'run1', status: 'PENDING' });
    expect(APPLY_BATCH).toBe(4);
  });

  it('marks a file already inside its owner folder as in place without copying', async () => {
    const r = row({ file_path: '/production/pods/p1/reels/clip.mp4', target_folder: '/production/pods/p1/media' });
    queue([r]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 1, failed: 0, more: true });
    expect(statusOf(r._id)).toEqual([{ status: 'IN_PLACE' }]);
    expect(library.copy).not.toHaveBeenCalled();
  });

  it('copies the file, then rewrites every field that still holds the original value', async () => {
    const id = new Types.ObjectId().toHexString();
    const updateOne = registerModel('Pod', 1);
    const r = row({
      file_path: '/old/my%20pic.jpg',
      refs: [
        { model: 'Pod', doc_id: id, path: 'cover', value: `${ENDPOINT}/old/my%20pic.jpg?tr=w-400`, new_value: '', rewritten: false },
      ],
    });
    queue([r]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 1, failed: 0, more: true });

    expect(library.createFolder).toHaveBeenCalledWith(r.target_folder);
    expect(library.copy).toHaveBeenCalledWith('/old/my pic.jpg', r.target_folder);
    const newValue = `${ENDPOINT}${r.target_folder}/my%20pic.jpg?tr=w-400`;
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter._id.$in).toHaveLength(2);
    expect(filter._id.$in[0]).toBeInstanceOf(Types.ObjectId);
    expect(filter._id.$in[1]).toBe(id);
    expect(filter.cover).toBe(`${ENDPOINT}/old/my%20pic.jpg?tr=w-400`);
    expect(update).toEqual({ $set: { cover: newValue } });
    expect(statusOf(r._id)).toEqual([
      {
        status: 'DONE',
        new_file_path: `${r.target_folder}/my%20pic.jpg`,
        refs: [{ ...r.refs[0], new_value: newValue, rewritten: true }],
      },
    ]);
  });

  it('matches a non-ObjectId document id as it is', async () => {
    const updateOne = registerModel('Pod', 1);
    queue([row({ refs: [{ model: 'Pod', doc_id: 'plain-id', path: 'cover', value: `${ENDPOINT}/old/pic.jpg`, new_value: '', rewritten: false }] })]);
    await applyBatch('run1', ENDPOINT);
    expect(updateOne.mock.calls[0][0]._id).toEqual({ $in: ['plain-id'] });
  });

  it('leaves a field alone that changed since the scan (nothing modified) or whose model is gone', async () => {
    registerModel('Pod', 0);
    const r = row({
      refs: [
        { model: 'Pod', doc_id: 'a', path: 'cover', value: `${ENDPOINT}/old/pic.jpg`, new_value: '', rewritten: false },
        { model: 'Ghost', doc_id: 'b', path: 'cover', value: `${ENDPOINT}/old/pic.jpg`, new_value: '', rewritten: false },
        { model: 'Pod', doc_id: 'c', path: 'note', value: 'no longer mentions the file', new_value: '', rewritten: false },
      ],
    });
    queue([r]);
    await applyBatch('run1', ENDPOINT);
    const refs = statusOf(r._id)[0].refs;
    expect(refs.map((x: any) => x.rewritten)).toEqual([false, false, false]);
    expect(refs[2].new_value).toBe('no longer mentions the file');
    expect(statusOf(r._id)[0].status).toBe('DONE');
  });

  it('refuses to copy onto a different file that already has the name, and records the failure', async () => {
    const r = row();
    queue([r]);
    const dest = `${r.target_folder}/pic.jpg`;
    library.list.mockImplementation(async ({ search }: any) =>
      search === 'pic.jpg' ? ([{ type: 'file', filePath: dest, size: 10 }, { type: 'file', filePath: '/old/pic.jpg', size: 99 }, { type: 'folder', filePath: dest, size: 0 }] as never) : []
    );
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 0, failed: 1, more: true });
    expect(library.copy).not.toHaveBeenCalled();
    expect(statusOf(r._id)).toEqual([{ status: 'FAILED', error: 'A different file already has this name in the destination folder; left where it is.' }]);
    expect(logs.server.error).toHaveBeenCalledWith('mediaOrganizer', 'relocate', expect.objectContaining({ run_id: 'run1', file_path: '/old/pic.jpg' }));
  });

  it('refuses when the destination file exists but the original cannot be found', async () => {
    const r = row();
    queue([r]);
    const dest = `${r.target_folder}/pic.jpg`;
    library.list.mockImplementation(async ({ path }: any) => (path === r.target_folder ? ([{ type: 'file', filePath: dest, size: 10 }] as never) : []));
    await expect(applyBatch('run1', ENDPOINT)).resolves.toMatchObject({ failed: 1 });
  });

  it('treats the same-size file at the destination as an earlier copy of this one and carries on', async () => {
    const r = row({ file_path: '/pic.jpg' });
    queue([r]);
    const dest = `${r.target_folder}/pic.jpg`;
    library.list.mockImplementation(async ({ path, search }: any) => {
      expect(search).toBe('pic.jpg');
      return (path === '/' ? [{ type: 'file', filePath: '/pic.jpg', size: 10 }] : [{ type: 'file', filePath: dest, size: 10 }]) as never;
    });
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 1, failed: 0, more: true });
    expect(library.copy).toHaveBeenCalledWith('/pic.jpg', r.target_folder);
  });

  it('creates each target folder once and carries on when the folder already exists', async () => {
    library.createFolder.mockRejectedValue(new Error('exists'));
    const a = row({ target_folder: '/production/pods/shared/media', file_path: '/old/a.jpg' });
    const b = row({ target_folder: '/production/pods/shared/media', file_path: '/old/b.jpg' });
    queue([a]);
    await applyBatch('run1', ENDPOINT);
    queue([b]);
    await applyBatch('run1', ENDPOINT);
    expect(library.createFolder).toHaveBeenCalledTimes(1);
    expect(library.copy).toHaveBeenCalledTimes(2);
  });

  it('fails a file whose copy call fails, with a non-Error reason stringified and capped', async () => {
    library.copy.mockRejectedValueOnce('x'.repeat(600));
    const r = row();
    queue([r]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toMatchObject({ done: 0, failed: 1 });
    expect(statusOf(r._id)[0]).toEqual({ status: 'FAILED', error: 'x'.repeat(500) });
  });

  it('fails a file when recording its progress throws unexpectedly, without losing the batch', async () => {
    const bad = row({ file_path: '/production/pods/p9/reels/x.mp4', target_folder: '/production/pods/p9/media' });
    const good = row({ file_path: '/old/ok.jpg' });
    rowUpdate.mockImplementationOnce(async () => {
      throw new Error('mongo down');
    });
    queue([bad, good]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 1, failed: 1, more: true });
    expect(statusOf(bad._id).at(-1)).toEqual({ status: 'FAILED', error: 'mongo down' });
  });

  it('holds back a second file bound for the same destination until the next batch', async () => {
    const first = row({ file_path: '/old/one/pic.jpg', target_folder: '/production/pods/dup/media' });
    const second = row({ file_path: '/old/two/pic.jpg', target_folder: '/production/pods/dup/media' });
    queue([first, second]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toEqual({ done: 1, failed: 0, more: true });
    expect(library.copy).toHaveBeenCalledTimes(1);
    expect(statusOf(second._id)).toEqual([]);
    // The slot is free again for the retry.
    queue([second]);
    await expect(applyBatch('run1', ENDPOINT)).resolves.toMatchObject({ done: 1 });
  });
});

describe('rollbackBatch', () => {
  it('points rewritten fields back at the original and marks the row rolled back', async () => {
    const updateOne = registerModel('Pod', 1);
    const r = row({
      refs: [
        { model: 'Pod', doc_id: 'a', path: 'cover', value: 'old-url', new_value: 'new-url', rewritten: true },
        { model: 'Pod', doc_id: 'b', path: 'cover', value: 'old-2', new_value: 'new-2', rewritten: false },
      ],
    });
    queue([r]);
    await expect(rollbackBatch('run1')).resolves.toEqual({ done: 1, more: false });
    expect(MediaRelocationModel.find).toHaveBeenCalledWith({ run_id: 'run1', status: 'DONE' });
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith({ _id: { $in: ['a'] }, cover: 'new-url' }, { $set: { cover: 'old-url' } });
    expect(statusOf(r._id)).toEqual([{ status: 'ROLLED_BACK' }]);
  });

  it('reports more work when the batch came back full', async () => {
    queue(Array.from({ length: 25 }, () => row()));
    await expect(rollbackBatch('run1')).resolves.toEqual({ done: 25, more: true });
  });

  it('does nothing for a run with no finished files', async () => {
    queue([]);
    await expect(rollbackBatch('run1')).resolves.toEqual({ done: 0, more: false });
  });
});
