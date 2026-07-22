import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserAddressModel, type IUserAddress } from './addressBook.model';

const badInput = (msg: string) =>
  new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const clean = (value: string | null | undefined, max: number) =>
  (value ?? '').trim().slice(0, max);

const toPub = (d: IUserAddress) => ({
  id: String(d._id),
  label: d.label,
  name: d.name,
  phone: d.phone,
  email: d.email,
  line1: d.line1,
  line2: d.line2,
  landmark: d.landmark,
  city: d.city,
  state: d.state,
  pincode: d.pincode,
  country: d.country,
  is_default: !!d.is_default,
  created_at: d.created_at.toISOString(),
  updated_at: d.updated_at.toISOString(),
});

function validate(input: any) {
  if (!clean(input.line1, 200)) throw badInput('Address line 1 is required');
  if (!clean(input.city, 120)) throw badInput('City is required');
  if (!clean(input.state, 120)) throw badInput('State is required');
  const pincode = clean(input.pincode, 12);
  if (!/^\d{4,10}$/.test(pincode)) throw badInput('Enter a valid pincode');
}

export const addressBookService = {
  async listMine(userId: string) {
    const docs = await UserAddressModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ is_default: -1, updated_at: -1 })
      .limit(50);
    return docs.map(toPub);
  },

  async save(userId: string, id: string | null | undefined, input: any) {
    validate(input);
    const owner = new Types.ObjectId(userId);
    const fields = {
      label: clean(input.label, 60) || 'Home',
      name: clean(input.name, 120),
      phone: clean(input.phone, 20),
      email: clean(input.email, 160).toLowerCase(),
      line1: clean(input.line1, 200),
      line2: clean(input.line2, 200),
      landmark: clean(input.landmark, 160),
      city: clean(input.city, 120),
      state: clean(input.state, 120),
      pincode: clean(input.pincode, 12),
      country: clean(input.country, 80) || 'India',
    };
    let doc: IUserAddress | null;
    if (id) {
      doc = await UserAddressModel.findOne({ _id: id, user_id: owner });
      if (!doc) throw new GraphQLError('Address not found', { extensions: { code: 'NOT_FOUND' } });
      Object.assign(doc, fields);
    } else {
      const count = await UserAddressModel.countDocuments({ user_id: owner });
      doc = new UserAddressModel({ user_id: owner, ...fields, is_default: count === 0 });
    }
    if (input.is_default === true) doc.is_default = true;
    await doc.save();
    if (doc.is_default) {
      await UserAddressModel.updateMany(
        { user_id: owner, _id: { $ne: doc._id } },
        { $set: { is_default: false } }
      );
    }
    return toPub(doc);
  },

  async remove(userId: string, id: string) {
    const owner = new Types.ObjectId(userId);
    const doc = await UserAddressModel.findOneAndDelete({ _id: id, user_id: owner });
    if (!doc) throw new GraphQLError('Address not found', { extensions: { code: 'NOT_FOUND' } });
    // Deleting the default promotes the most recently used remaining address.
    if (doc.is_default) {
      const next = await UserAddressModel.findOne({ user_id: owner }).sort({ updated_at: -1 });
      if (next) {
        next.is_default = true;
        await next.save();
      }
    }
    return true;
  },

  async setDefault(userId: string, id: string) {
    const owner = new Types.ObjectId(userId);
    const doc = await UserAddressModel.findOne({ _id: id, user_id: owner });
    if (!doc) throw new GraphQLError('Address not found', { extensions: { code: 'NOT_FOUND' } });
    doc.is_default = true;
    await doc.save();
    await UserAddressModel.updateMany(
      { user_id: owner, _id: { $ne: doc._id } },
      { $set: { is_default: false } }
    );
    return toPub(doc);
  },
};
