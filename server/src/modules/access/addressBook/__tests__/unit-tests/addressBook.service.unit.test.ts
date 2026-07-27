/**
 * Pure unit cover for the address-book service: validation, the "first address
 * becomes the default" rule, the single-default invariant and the promote-on-
 * delete rule — all with the Mongoose model replaced by a fake.
 */
jest.mock('../../addressBook.model', () => {
  function FakeAddress(this: any, fields: Record<string, unknown>) {
    Object.assign(this, fields);
    this._id = 'new-doc-id';
    this.created_at = new Date('2026-01-01T00:00:00.000Z');
    this.updated_at = new Date('2026-01-02T03:04:05.000Z');
    this.save = jest.fn().mockResolvedValue(undefined);
  }
  const Model = FakeAddress as unknown as Record<string, jest.Mock>;
  Model.find = jest.fn();
  Model.findOne = jest.fn();
  Model.findOneAndDelete = jest.fn();
  Model.countDocuments = jest.fn();
  Model.updateMany = jest.fn();
  return { UserAddressModel: Model };
});

import { Types } from 'mongoose';
import { addressBookService } from '../../addressBook.service';
import { UserAddressModel } from '../../addressBook.model';

const model = UserAddressModel as unknown as Record<string, jest.Mock>;

const USER_ID = '65b000000000000000000001';
const OTHER_ID = '65b000000000000000000002';

/** Minimal saved-address document as the service sees it after a find. */
const makeDoc = (over: Record<string, unknown> = {}) =>
  ({
    _id: 'addr-1',
    label: 'Home',
    name: 'Ada',
    phone: '9990001111',
    email: 'ada@duncit.com',
    line1: '12 Park Street',
    line2: '',
    landmark: '',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700016',
    country: 'India',
    is_default: false,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T03:04:05.000Z'),
    save: jest.fn().mockResolvedValue(undefined),
    ...over,
  }) as any;

/** A valid create/update payload; individual tests override one field. */
const validInput = (over: Record<string, unknown> = {}) => ({
  line1: '12 Park Street',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700016',
  ...over,
});

beforeEach(() => {
  model.find.mockReset();
  model.findOne.mockReset();
  model.findOneAndDelete.mockReset();
  model.countDocuments.mockReset();
  model.updateMany.mockReset();
  model.updateMany.mockResolvedValue({ modifiedCount: 0 });
});

describe('addressBookService.listMine', () => {
  it('scopes the query to the caller, puts defaults first and caps the page at 50', async () => {
    const limit = jest.fn().mockResolvedValue([makeDoc({ is_default: 1 })]);
    const sort = jest.fn().mockReturnValue({ limit });
    model.find.mockReturnValue({ sort });

    const rows = await addressBookService.listMine(USER_ID);

    expect(model.find).toHaveBeenCalledWith({ user_id: new Types.ObjectId(USER_ID) });
    expect(sort).toHaveBeenCalledWith({ is_default: -1, updated_at: -1 });
    expect(limit).toHaveBeenCalledWith(50);
    // toPub coerces the truthy 1 to a real boolean and serialises the dates.
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'addr-1',
        city: 'Kolkata',
        is_default: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T03:04:05.000Z',
      }),
    ]);
  });
});

describe('addressBookService.save validation', () => {
  it.each([
    ['line1', validInput({ line1: '   ' }), 'Address line 1 is required'],
    ['city', validInput({ city: null }), 'City is required'],
    ['state', validInput({ state: undefined }), 'State is required'],
    ['pincode', validInput({ pincode: '12' }), 'Enter a valid pincode'],
    ['non-numeric pincode', validInput({ pincode: 'ABC123' }), 'Enter a valid pincode'],
  ])('rejects a missing/invalid %s before touching the database', async (_case, input, message) => {
    await expect(addressBookService.save(USER_ID, null, input)).rejects.toThrow(message);
    expect(model.countDocuments).not.toHaveBeenCalled();
    expect(model.findOne).not.toHaveBeenCalled();
  });
});

describe('addressBookService.save (new address)', () => {
  it("makes the user's first address the default and applies the field defaults", async () => {
    model.countDocuments.mockResolvedValue(0);

    const saved = await addressBookService.save(
      USER_ID,
      null,
      validInput({ label: '  ', email: 'ADA@Duncit.COM', country: '', name: '  Ada  ' })
    );

    expect(model.countDocuments).toHaveBeenCalledWith({ user_id: new Types.ObjectId(USER_ID) });
    expect(saved).toMatchObject({
      id: 'new-doc-id',
      label: 'Home',
      country: 'India',
      email: 'ada@duncit.com',
      name: 'Ada',
      is_default: true,
    });
    // Being the only address, there is nothing to un-default.
    expect(model.updateMany).toHaveBeenCalledWith(
      { user_id: new Types.ObjectId(USER_ID), _id: { $ne: 'new-doc-id' } },
      { $set: { is_default: false } }
    );
  });

  it('does not make a second address the default, and clears no sibling', async () => {
    model.countDocuments.mockResolvedValue(3);

    const saved = await addressBookService.save(USER_ID, null, validInput({ label: 'Office' }));

    expect(saved).toMatchObject({ label: 'Office', is_default: false });
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it('trims and caps over-long values to the schema limits', async () => {
    model.countDocuments.mockResolvedValue(1);

    const saved = await addressBookService.save(
      USER_ID,
      null,
      validInput({ line1: `  ${'x'.repeat(260)}  `, label: 'L'.repeat(90), landmark: '  Near the park  ' })
    );

    expect(saved.line1).toHaveLength(200);
    expect(saved.label).toHaveLength(60);
    expect(saved.landmark).toBe('Near the park');
  });

  it('honours an explicit is_default on a non-first address and un-defaults the rest', async () => {
    model.countDocuments.mockResolvedValue(2);

    const saved = await addressBookService.save(USER_ID, null, validInput({ is_default: true }));

    expect(saved.is_default).toBe(true);
    expect(model.updateMany).toHaveBeenCalledWith(
      { user_id: new Types.ObjectId(USER_ID), _id: { $ne: 'new-doc-id' } },
      { $set: { is_default: false } }
    );
  });
});

describe('addressBookService.save (existing address)', () => {
  it("updates only an address owned by the caller and keeps its default flag", async () => {
    const doc = makeDoc({ is_default: false, city: 'Kolkata' });
    model.findOne.mockResolvedValue(doc);

    const saved = await addressBookService.save(
      USER_ID,
      'addr-1',
      validInput({ city: 'Pune', state: 'Maharashtra', pincode: '411001' })
    );

    expect(model.findOne).toHaveBeenCalledWith({
      _id: 'addr-1',
      user_id: new Types.ObjectId(USER_ID),
    });
    expect(model.countDocuments).not.toHaveBeenCalled();
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(saved).toMatchObject({ id: 'addr-1', city: 'Pune', pincode: '411001', is_default: false });
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to edit an address that is not the caller's", async () => {
    model.findOne.mockResolvedValue(null);

    await expect(
      addressBookService.save(OTHER_ID, 'addr-1', validInput())
    ).rejects.toThrow('Address not found');
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it('re-asserts the single-default invariant when an edited address stays default', async () => {
    const doc = makeDoc({ is_default: true });
    model.findOne.mockResolvedValue(doc);

    const saved = await addressBookService.save(USER_ID, 'addr-1', validInput());

    expect(saved.is_default).toBe(true);
    expect(model.updateMany).toHaveBeenCalledWith(
      { user_id: new Types.ObjectId(USER_ID), _id: { $ne: 'addr-1' } },
      { $set: { is_default: false } }
    );
  });
});

describe('addressBookService.remove', () => {
  it('deletes a non-default address without promoting anything', async () => {
    model.findOneAndDelete.mockResolvedValue(makeDoc({ is_default: false }));

    await expect(addressBookService.remove(USER_ID, 'addr-1')).resolves.toBe(true);

    expect(model.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'addr-1',
      user_id: new Types.ObjectId(USER_ID),
    });
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('promotes the most recently updated survivor when the default is deleted', async () => {
    model.findOneAndDelete.mockResolvedValue(makeDoc({ is_default: true }));
    const next = makeDoc({ _id: 'addr-2', is_default: false });
    const sort = jest.fn().mockResolvedValue(next);
    model.findOne.mockReturnValue({ sort });

    await addressBookService.remove(USER_ID, 'addr-1');

    expect(sort).toHaveBeenCalledWith({ updated_at: -1 });
    expect(next.is_default).toBe(true);
    expect(next.save).toHaveBeenCalledTimes(1);
  });

  it('deleting the last (default) address leaves nothing to promote', async () => {
    model.findOneAndDelete.mockResolvedValue(makeDoc({ is_default: true }));
    model.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });

    await expect(addressBookService.remove(USER_ID, 'addr-1')).resolves.toBe(true);
  });

  it("refuses to delete another user's address", async () => {
    model.findOneAndDelete.mockResolvedValue(null);

    await expect(addressBookService.remove(OTHER_ID, 'addr-1')).rejects.toThrow('Address not found');
    expect(model.findOne).not.toHaveBeenCalled();
  });
});

describe('addressBookService.setDefault', () => {
  it('marks the chosen address default and clears every sibling', async () => {
    const doc = makeDoc({ is_default: false });
    model.findOne.mockResolvedValue(doc);

    const result = await addressBookService.setDefault(USER_ID, 'addr-1');

    expect(doc.is_default).toBe(true);
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(model.updateMany).toHaveBeenCalledWith(
      { user_id: new Types.ObjectId(USER_ID), _id: { $ne: 'addr-1' } },
      { $set: { is_default: false } }
    );
    expect(result).toMatchObject({ id: 'addr-1', is_default: true });
  });

  it("refuses to default another user's address", async () => {
    model.findOne.mockResolvedValue(null);

    await expect(addressBookService.setDefault(OTHER_ID, 'addr-1')).rejects.toThrow(
      'Address not found'
    );
    expect(model.updateMany).not.toHaveBeenCalled();
  });
});
