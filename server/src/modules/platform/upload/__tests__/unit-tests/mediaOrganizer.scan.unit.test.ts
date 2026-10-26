import mongoose, { Types } from 'mongoose';
import { SCAN_BATCH, countOwnerDocs, ownerFilter, ownerIdOf, scanBatch } from '../../mediaOrganizer.scan';
import { MEDIA_OWNERS, type MediaOwner } from '../../mediaOrganizer.registry';
import { MediaRelocationModel } from '../../mediaRelocation.model';
import { entityFolder } from '../../mediaFolders';

jest.mock('../../mediaRelocation.model', () => ({ MediaRelocationModel: { bulkWrite: jest.fn(), updateMany: jest.fn() } }));

const ENDPOINT = 'https://ik.imagekit.io/acme';
const POD = 0;
const podOwner = MEDIA_OWNERS[POD];
const messageOwner = MEDIA_OWNERS.find((o) => o.model === 'PodMessage') as MediaOwner;
const postOwner = MEDIA_OWNERS.find((o) => o.model === 'Post') as MediaOwner;

const registered: string[] = [];
const originals = new Map<string, unknown>();
function registerModel(name: string, docs: unknown[] = [], count = 0) {
  const toArray = jest.fn().mockResolvedValue(docs);
  const limit = jest.fn().mockReturnValue({ toArray });
  const sort = jest.fn().mockReturnValue({ limit });
  const find = jest.fn().mockReturnValue({ sort });
  const countDocuments = jest.fn().mockResolvedValue(count);
  originals.set(name, (mongoose.models as Record<string, unknown>)[name]);
  (mongoose.models as Record<string, unknown>)[name] = { collection: { find, countDocuments } };
  registered.push(name);
  return { find, sort, limit, toArray, countDocuments };
}
afterEach(() => {
  for (const name of registered.splice(0)) {
    const original = originals.get(name);
    if (original === undefined) delete (mongoose.models as Record<string, unknown>)[name];
    else (mongoose.models as Record<string, unknown>)[name] = original;
  }
  originals.clear();
});

const oid = () => new Types.ObjectId();

describe('ownerIdOf', () => {
  it('reads a top-level id, hex-encoding ObjectIds', () => {
    const id = oid();
    expect(ownerIdOf({ _id: id }, podOwner)).toBe(id.toHexString());
  });

  it('reads a dotted owner field and plain string ids', () => {
    const nested = { ...podOwner, owner: 'a.b' };
    expect(ownerIdOf({ a: { b: 'user_1' } }, nested)).toBe('user_1');
  });

  it('is null when the owner field is missing, empty or its parent is not an object', () => {
    const nested = { ...podOwner, owner: 'a.b' };
    expect(ownerIdOf({}, nested)).toBeNull();
    expect(ownerIdOf({ a: 'text' }, nested)).toBeNull();
    expect(ownerIdOf({ a: null }, nested)).toBeNull();
    expect(ownerIdOf({ _id: '   ' }, podOwner)).toBeNull();
  });

  it('cleans an id that is not a safe folder segment', () => {
    expect(ownerIdOf({ _id: 'a-b c' }, podOwner)).toBe('a_b_c');
  });
});

describe('ownerFilter', () => {
  it('is open without a cursor or skip rule', () => {
    expect(ownerFilter(podOwner, null)).toEqual({});
  });

  it('continues after the cursor and excludes short-lived rows', () => {
    expect(ownerFilter(postOwner, 'c1')).toEqual({ _id: { $gt: 'c1' }, $nor: [{ kind: 'STORY' }] });
  });
});

describe('countOwnerDocs', () => {
  it('sums the in-scope documents of every owner collection, counting an unregistered model as zero', async () => {
    for (const owner of MEDIA_OWNERS) {
      if (owner.model === 'Pod') registerModel('Pod', [], 5);
      else if (owner.model === 'Club') registerModel('Club', [], 7);
      else {
        originals.set(owner.model, (mongoose.models as Record<string, unknown>)[owner.model]);
        delete (mongoose.models as Record<string, unknown>)[owner.model];
        registered.push(owner.model);
      }
    }
    await expect(countOwnerDocs()).resolves.toBe(12);
    expect((mongoose.models.Pod as any).collection.countDocuments).toHaveBeenCalledWith({});
  });
});

describe('scanBatch', () => {
  const bulk = MediaRelocationModel.bulkWrite as jest.Mock;
  const updateMany = MediaRelocationModel.updateMany as jest.Mock;

  it('reads nothing for an owner model this process does not have', async () => {
    await expect(scanBatch('run1', ENDPOINT, POD, null)).resolves.toEqual({ read: 0, cursor: null });
    expect(bulk).not.toHaveBeenCalled();
  });

  it('records every ImageKit file a document references, with the rewrite coordinates', async () => {
    const id = oid();
    const m = registerModel('Pod', [
      {
        _id: id,
        title: 'plain text',
        cover: `${ENDPOINT}/old/a.jpg?tr=w-400`,
        gallery: [`${ENDPOINT}/old/b.png`, 12, null],
        nested: { when: new Date(), ref: oid(), raw: Buffer.from('x'), html: `<img src="${ENDPOINT}/old/a.jpg">` },
      },
    ]);
    await expect(scanBatch('run1', ENDPOINT, POD, null)).resolves.toEqual({ read: 1, cursor: null });

    expect(m.sort).toHaveBeenCalledWith({ _id: 1 });
    expect(m.limit).toHaveBeenCalledWith(SCAN_BATCH);
    const ops = bulk.mock.calls[0][0];
    expect(ops).toHaveLength(2);
    const byFile = Object.fromEntries(ops.map((op: any) => [op.updateOne.filter.file_path, op.updateOne]));
    const folder = entityFolder('pods', id.toHexString(), 'media');
    const a = byFile['/old/a.jpg'];
    expect(a.filter).toEqual({ run_id: 'run1', file_path: '/old/a.jpg' });
    expect(a.upsert).toBe(true);
    expect(a.update.$setOnInsert).toEqual({ target_folder: folder, status: 'PENDING' });
    expect(a.update.$addToSet).toEqual({ owners: { $each: [`pods/${id.toHexString()}`] } });
    expect(a.update.$push.refs.$each).toEqual([
      { model: 'Pod', doc_id: id.toHexString(), path: 'cover', value: `${ENDPOINT}/old/a.jpg?tr=w-400`, new_value: '', rewritten: false },
      { model: 'Pod', doc_id: id.toHexString(), path: 'nested.html', value: `<img src="${ENDPOINT}/old/a.jpg">`, new_value: '', rewritten: false },
    ]);
    expect(byFile['/old/b.png'].update.$push.refs.$each[0].path).toBe('gallery.0');
    expect(bulk.mock.calls[0][1]).toEqual({ ordered: false });
    expect(updateMany).toHaveBeenCalledWith(
      { run_id: 'run1', file_path: { $in: ['/old/a.jpg', '/old/b.png'] }, 'owners.1': { $exists: true } },
      { $set: { status: 'SHARED', refs: [] } }
    );
  });

  it('does not read ids as text, and stops descending at the depth limit', async () => {
    let deep: unknown = `${ENDPOINT}/deep/z.jpg`;
    for (let i = 0; i < 12; i += 1) deep = { child: deep };
    registerModel('Pod', [{ _id: oid(), tooDeep: deep, shallow: { child: { url: `${ENDPOINT}/ok/s.jpg` } } }]);
    await scanBatch('run1', ENDPOINT, POD, null);
    const files = bulk.mock.calls[0][0].map((op: any) => op.updateOne.filter.file_path);
    expect(files).toEqual(['/ok/s.jpg']);
  });

  it('skips documents with no owner id and records nothing when there is nothing to record', async () => {
    registerModel('PodMessage', [{ _id: oid(), text: `${ENDPOINT}/c/a.jpg` }, { _id: oid(), pod_id: oid(), text: 'no files' }]);
    await expect(scanBatch('run1', ENDPOINT, MEDIA_OWNERS.indexOf(messageOwner), null)).resolves.toEqual({ read: 2, cursor: null });
    expect(bulk).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('groups a file seen in several documents under one row with every owner', async () => {
    const [a, b] = [oid(), oid()];
    registerModel('Pod', [
      { _id: a, cover: `${ENDPOINT}/shared/stock.jpg` },
      { _id: b, cover: `${ENDPOINT}/shared/stock.jpg` },
    ]);
    await scanBatch('run1', ENDPOINT, POD, null);
    const [op] = bulk.mock.calls[0][0];
    expect(op.updateOne.update.$addToSet.owners.$each.sort()).toEqual([`pods/${a.toHexString()}`, `pods/${b.toHexString()}`].sort());
    expect(op.updateOne.update.$push.refs.$each.map((r: any) => r.doc_id)).toEqual([a.toHexString(), b.toHexString()]);
  });

  it('continues from the cursor and hands back the last id when the batch is full', async () => {
    const docs = Array.from({ length: SCAN_BATCH }, (_, i) => ({ _id: `d${i}` }));
    const m = registerModel('Pod', docs);
    await expect(scanBatch('run1', ENDPOINT, POD, 'd-prev')).resolves.toEqual({ read: SCAN_BATCH, cursor: `d${SCAN_BATCH - 1}` });
    expect(m.find).toHaveBeenCalledWith({ _id: { $gt: 'd-prev' } });
  });
});
