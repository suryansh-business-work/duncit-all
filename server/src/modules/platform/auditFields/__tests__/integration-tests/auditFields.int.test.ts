/**
 * Who created a record and who last changed it, stamped from the person behind
 * the request — against a real database, through a model that carries the
 * plugin exactly as the global registration gives it.
 *
 * What matters: the stamp comes from the verified identity and never from the
 * payload; a value the write sets on purpose always wins; an unchanged save is
 * never turned into a write; and a sweep, a log collection or an unreadable id
 * stamps nothing.
 */
import mongoose, { Schema, Types } from 'mongoose';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { auditFieldsPlugin } from '../../auditFields.plugin';

interface IThing {
  name: string;
  qty: number;
  created_by?: Types.ObjectId | null;
  updated_by?: Types.ObjectId | null;
}

const build = (name: string, extra: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => {
  const schema = new Schema({ name: { type: String, required: true }, qty: { type: Number, default: 0 }, ...extra }, options);
  schema.plugin(auditFieldsPlugin);
  return mongoose.model<IThing>(name, schema);
};

const Thing = build('AuditThing');
const alice = new Types.ObjectId();
const bob = new Types.ObjectId();
const as = (id: Types.ObjectId | string): RequestIdentity => ({ user: { id: String(id) } });
const within = <T>(id: Types.ObjectId | string, fn: () => Promise<T>) => requestIdentity.run(as(id), fn);
const read = (id: unknown, model = Thing) => model.findById(id).lean<IThing>();

describe('the schema', () => {
  it('gains timestamps when it declares none, and keeps its own when it declares them or opts out', () => {
    expect(Thing.schema.options.timestamps).toEqual({ createdAt: 'created_at', updatedAt: 'updated_at' });
    const own = build('AuditOwnStamps', {}, { timestamps: { createdAt: 'made', updatedAt: 'changed' } });
    expect(own.schema.options.timestamps).toEqual({ createdAt: 'made', updatedAt: 'changed' });
    const off = build('AuditNoStamps', {}, { timestamps: false });
    expect(off.schema.options.timestamps).toBe(false);
  });

  it('adds only the audit field it does not declare itself, and none when it declares both', async () => {
    const own = build('AuditOwnCreator', { created_by: { type: String } });
    expect(own.schema.path('created_by').instance).toBe('String');
    expect(own.schema.path('updated_by').instance).toBe('ObjectId');
    const both = build('AuditBoth', { created_by: { type: String }, updated_by: { type: String } });
    const doc = await within(alice, () => both.create({ name: 'x' }));
    expect((await both.findById(doc._id).lean())?.created_by).toBeUndefined();
  });
});

describe('save', () => {
  it('stamps both fields on a new record and only updated_by on an edit', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    expect(await read(thing._id)).toMatchObject({ created_by: alice, updated_by: alice });
    thing.qty = 5;
    await within(bob, () => thing.save());
    expect(await read(thing._id)).toMatchObject({ created_by: alice, updated_by: bob, qty: 5 });
  });

  it('keeps a value the write sets on purpose, null included', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a', created_by: bob, updated_by: null }));
    expect(await read(thing._id)).toMatchObject({ created_by: bob, updated_by: null });
  });

  it('does not turn a save that changes nothing into a write', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    const before = await read(thing._id);
    await within(bob, () => thing.save());
    expect(await read(thing._id)).toEqual(before);
  });

  it('stamps nothing for a write with nobody behind it, or one whose id is not an account id', async () => {
    const swept = await Thing.create({ name: 'swept' });
    expect(await read(swept._id)).not.toHaveProperty('created_by');
    const odd = await within('service-account-7', () => Thing.create({ name: 'odd' }));
    expect(await read(odd._id)).not.toHaveProperty('updated_by');
  });

  it('stamps nothing on a collection that is itself a log', async () => {
    const Audit = build('AuditProbeLogs');
    const row = await within(alice, () => Audit.create({ name: 'x' }));
    expect(await read(row._id, Audit as never)).not.toHaveProperty('created_by');
  });
});

describe('insertMany', () => {
  it('stamps documents and plain objects alike, without overwriting a value given', async () => {
    const docs = await within(alice, () => Thing.insertMany([{ name: 'one' }, { name: 'two', created_by: bob }, new Thing({ name: 'three' })]));
    const rows = await Thing.find({ _id: { $in: docs.map((d) => d._id) } }).sort({ name: 1 }).lean<IThing[]>();
    expect(rows.map((r) => [r.name, String(r.created_by), String(r.updated_by)])).toEqual([
      ['one', String(alice), String(alice)],
      ['three', String(alice), String(alice)],
      ['two', String(bob), String(alice)],
    ]);
  });

  it('stamps a single document handed in without a list', async () => {
    await within(alice, () => Thing.insertMany({ name: 'single' } as never));
    expect(await Thing.findOne({ name: 'single' }).lean<IThing>()).toMatchObject({ created_by: alice, updated_by: alice });
  });

  it('leaves anything that is not a document to mongoose to refuse, as it would without the plugin', async () => {
    await expect(within(alice, () => Thing.insertMany(['not a document'] as never))).rejects.toBeDefined();
  });

  it('stamps nothing without a person', async () => {
    const [doc] = await Thing.insertMany([{ name: 'plain' }]);
    expect(await read(doc._id)).not.toHaveProperty('created_by');
  });
});

describe('updates', () => {
  it('stamps updated_by into $set, merging with what the update already sets', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    await within(bob, () => Thing.updateOne({ _id: thing._id }, { $set: { qty: 2 } }).exec());
    expect(await read(thing._id)).toMatchObject({ qty: 2, created_by: alice, updated_by: bob });
    await within(alice, () => Thing.updateMany({}, { qty: 3 }).exec());
    expect(await read(thing._id)).toMatchObject({ qty: 3, updated_by: alice });
    await within(bob, () => Thing.findOneAndUpdate({ _id: thing._id }, { $inc: { qty: 1 } }).exec());
    expect(await read(thing._id)).toMatchObject({ qty: 4, updated_by: bob });
  });

  it('leaves updated_by alone when the update writes it itself, at the top level or under an operator', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    await within(bob, () => Thing.updateOne({ _id: thing._id }, { $set: { updated_by: alice } }).exec());
    expect((await read(thing._id))?.updated_by).toEqual(alice);
    await within(bob, () => Thing.updateOne({ _id: thing._id }, { $unset: { updated_by: 1 } }).exec());
    expect(await read(thing._id)).not.toHaveProperty('updated_by');
  });

  it('adds created_by on an upsert that inserts, merging with $setOnInsert, and never on one that only edits', async () => {
    const inserted = await within(alice, () => Thing.findOneAndUpdate({ name: 'fresh' }, { $set: { qty: 1 } }, { upsert: true, new: true }).exec());
    expect(await read(inserted?._id)).toMatchObject({ created_by: alice, updated_by: alice });
    const merged = await within(alice, () => Thing.updateOne({ name: 'second' }, { $setOnInsert: { qty: 9 } }, { upsert: true }).exec());
    const second = await Thing.findOne({ name: 'second' }).lean<IThing>();
    expect(merged.upsertedCount).toBe(1);
    expect(second).toMatchObject({ qty: 9, created_by: alice });
    await within(bob, () => Thing.updateOne({ name: 'fresh' }, { $set: { qty: 2 } }, { upsert: true }).exec());
    expect(await Thing.findOne({ name: 'fresh' }).lean<IThing>()).toMatchObject({ created_by: alice, updated_by: bob });
  });

  it('respects a created_by the upsert sets itself', async () => {
    await within(alice, () => Thing.updateOne({ name: 'own' }, { $setOnInsert: { created_by: bob } }, { upsert: true }).exec());
    expect(await Thing.findOne({ name: 'own' }).lean<IThing>()).toMatchObject({ created_by: bob, updated_by: alice });
  });

  it('stamps an aggregation-pipeline update with a closing stage, unless it already writes updated_by', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    await within(bob, () => Thing.updateOne({ _id: thing._id }, [{ $set: { qty: 7 } }]).exec());
    expect(await read(thing._id)).toMatchObject({ qty: 7, updated_by: bob });
    await within(alice, () => Thing.updateOne({ _id: thing._id }, [{ $set: { qty: 8, updated_by: bob } }]).exec());
    expect(await read(thing._id)).toMatchObject({ qty: 8, updated_by: bob });
  });

  it('adds the $set itself when the schema keeps no timestamps and the update has none', async () => {
    const Bare = build('AuditBareUpdates', {}, { timestamps: false });
    const bare = await within(alice, () => Bare.create({ name: 'a' }));
    await within(bob, () => Bare.updateOne({ _id: bare._id }, { $inc: { qty: 1 } }).exec());
    expect(await read(bare._id, Bare as never)).toMatchObject({ qty: 1, updated_by: bob });
  });

  it('leaves a findOneAndUpdate that carries no update alone', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    await within(bob, () => Thing.findOneAndUpdate({ _id: thing._id }).exec());
    expect((await read(thing._id))?.updated_by).toEqual(alice);
  });

  it('stamps nothing without a person', async () => {
    const thing = await within(alice, () => Thing.create({ name: 'a' }));
    await Thing.updateOne({ _id: thing._id }, { $set: { qty: 2 } }).exec();
    expect(await read(thing._id)).toMatchObject({ qty: 2, updated_by: alice });
  });
});

describe('bulkWrite', () => {
  it('stamps inserts and updates, and ignores operations that write nothing', async () => {
    const existing = await within(alice, () => Thing.create({ name: 'old' }));
    await within(bob, () =>
      Thing.bulkWrite([
        { insertOne: { document: { name: 'plain-insert' } } },
        { insertOne: { document: new Thing({ name: 'doc-insert' }) as never } },
        { updateOne: { filter: { _id: existing._id }, update: { $set: { qty: 4 } } } },
        { updateOne: { filter: { name: 'upserted' }, update: { $set: { qty: 1 } }, upsert: true } },
        { updateMany: { filter: { name: 'old' }, update: { $set: { qty: 5 } } } },
        { updateMany: { filter: { name: 'many-upserted' }, update: { $set: { qty: 1 } }, upsert: true } },
        { deleteOne: { filter: { name: 'nothing-here' } } },
      ]),
    );
    expect(await read(existing._id)).toMatchObject({ qty: 5, created_by: alice, updated_by: bob });
    for (const name of ['plain-insert', 'doc-insert', 'upserted', 'many-upserted']) {
      expect(await Thing.findOne({ name }).lean<IThing>()).toMatchObject({ created_by: bob, updated_by: bob });
    }
  });

  it('stamps nothing without a person', async () => {
    await Thing.bulkWrite([{ insertOne: { document: { name: 'anon' } } }]);
    expect(await Thing.findOne({ name: 'anon' }).lean<IThing>()).not.toHaveProperty('created_by');
  });
});
