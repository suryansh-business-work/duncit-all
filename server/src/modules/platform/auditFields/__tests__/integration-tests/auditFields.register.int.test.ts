/**
 * The two registrations `src/index.ts` runs before any model compiles: after
 * them, a model nobody wired by hand carries both the audit stamps and the
 * change log — and a child schema does not get hooks of its own.
 */
import mongoose, { Schema, Types } from 'mongoose';
import { requestIdentity } from '@observability/requestIdentity';
import '../../../tableChangeLog/tableChangeLog.register';
import '../../auditFields.register';
import { TableChangeLogModel } from '../../../tableChangeLog/tableChangeLog.model';

const person = new Types.ObjectId();

describe('after registration', () => {
  it('stamps and logs a model that was never wired by hand, for the person behind the request', async () => {
    const Widget = mongoose.model('RegisteredWidget', new Schema({ name: String }));
    const widget = await requestIdentity.run({ user: { id: String(person) } }, () => Widget.create({ name: 'w' }));
    const stored = await Widget.findById(widget._id).lean<{ created_by?: Types.ObjectId; updated_by?: Types.ObjectId }>();
    expect(String(stored?.created_by)).toBe(String(person));
    expect(String(stored?.updated_by)).toBe(String(person));
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await TableChangeLogModel.countDocuments({ doc_id: String(widget._id) })) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(await TableChangeLogModel.findOne({ doc_id: String(widget._id) }).lean()).toMatchObject({ action: 'CREATE', actor_user_id: person });
  });

  it('leaves child schemas to their parent', () => {
    expect(mongoose.get('applyPluginsToChildSchemas')).toBe(false);
    const child = new Schema({ city: String }, { _id: false });
    mongoose.model('RegisteredParent', new Schema({ address: child }));
    expect(child.path('created_by')).toBeUndefined();
  });
});
