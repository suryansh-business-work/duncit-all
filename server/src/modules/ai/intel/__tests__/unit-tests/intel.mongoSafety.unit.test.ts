/**
 * Live-database safety rules: what a read may contain, what a write may do and
 * what is stripped before anything reaches the model or the screen.
 */
import mongoose from 'mongoose';
import { assertNoForbidden, assertWriteShape, describeShape, fromExtendedJson, previewUpdate, redact, sanitizePipeline, typeName, UnsafeQueryError } from '../../connectors/mongo/mongo.safety';

describe('assertNoForbidden', () => {
  it.each(['$where', '$function', '$accumulator', '$out', '$merge'])('refuses %s at any depth', (op) => {
    expect(() => assertNoForbidden({ a: { b: [{ [op]: 'x' }] } })).toThrow(UnsafeQueryError);
    expect(() => assertNoForbidden({ a: { b: [{ [op]: 'x' }] } })).toThrow(/a\.b\[0\]/);
  });

  it('accepts ordinary filters with operators', () => {
    expect(() => assertNoForbidden({ status: { $in: ['A', 'B'] }, created_at: { $gte: '2026-01-01' } })).not.toThrow();
  });
});

describe('sanitizePipeline', () => {
  it('appends a row cap no larger than 50', () => {
    const out = sanitizePipeline([{ $match: { a: 1 } }], ['pods'], 500);
    expect(out.at(-1)).toEqual({ $limit: 50 });
    expect(sanitizePipeline([{ $match: {} }], ['pods'], 10).at(-1)).toEqual({ $limit: 10 });
  });

  it('refuses write stages, unknown stages and multi-key stages', () => {
    expect(() => sanitizePipeline([{ $out: 'x' }], [], 10)).toThrow(UnsafeQueryError);
    expect(() => sanitizePipeline([{ $geoNear: {} }], [], 10)).toThrow(/not allowed in a read/);
    expect(() => sanitizePipeline([{ $match: {}, $sort: {} }], [], 10)).toThrow(UnsafeQueryError);
  });

  it('lets $lookup read only permitted collections', () => {
    expect(() => sanitizePipeline([{ $lookup: { from: 'users', as: 'u' } }], ['pods'], 10)).toThrow(/permitted collections/);
    expect(() => sanitizePipeline([{ $lookup: { from: 'clubs', as: 'c' } }], ['pods', 'clubs'], 10)).not.toThrow();
  });

  it('refuses something that is not an array and pipelines over 20 stages', () => {
    expect(() => sanitizePipeline({ $match: {} }, [], 10)).toThrow(/array/);
    expect(() => sanitizePipeline(Array.from({ length: 21 }, () => ({ $match: {} })), [], 10)).toThrow(/20 stages/);
  });
});

describe('assertWriteShape', () => {
  it('requires a non-empty filter for updates and deletes — never "every document"', () => {
    expect(() => assertWriteShape('deleteMany', {}, {})).toThrow(/non-empty filter/);
    expect(() => assertWriteShape('updateMany', null, { $set: { a: 1 } })).toThrow(/non-empty filter/);
  });

  it('requires update operators, refusing a replacement document', () => {
    expect(() => assertWriteShape('updateOne', { _id: 1 }, { name: 'x' })).toThrow(/operators/);
    expect(() => assertWriteShape('updateOne', { _id: 1 }, { $set: { name: 'x' } })).not.toThrow();
  });

  it('accepts one plain document for insertOne and refuses operators in it', () => {
    expect(() => assertWriteShape('insertOne', {}, { name: 'x' })).not.toThrow();
    expect(() => assertWriteShape('insertOne', {}, { $set: { a: 1 } })).toThrow(/operators/);
    expect(() => assertWriteShape('insertOne', {}, [{ a: 1 }])).toThrow(/one document/);
  });

  it('refuses unknown operations and code-running operators in the payload', () => {
    expect(() => assertWriteShape('drop', { a: 1 }, {})).toThrow(/Unknown write operation/);
    expect(() => assertWriteShape('updateOne', { a: 1 }, { $set: { b: { $function: 'x' } } })).toThrow(UnsafeQueryError);
  });
});

describe('redact', () => {
  it('removes credential-like fields at any depth and keeps the rest', () => {
    const out = redact({ name: 'Asha', password: 'p', profile: { api_key: 'k', city: 'BLR' }, tokens: [{ refresh_token: 'r' }] }) as Record<string, unknown>;
    expect(out).toEqual({ name: 'Asha', password: '[redacted]', profile: { api_key: '[redacted]', city: 'BLR' }, tokens: '[redacted]' });
  });

  it('turns ObjectIds and dates into strings and cuts very long strings', () => {
    const id = new mongoose.Types.ObjectId();
    const out = redact({ id, at: new Date('2026-01-02T03:04:05Z'), note: 'x'.repeat(2500) }) as Record<string, string>;
    expect(out.id).toBe(id.toHexString());
    expect(out.at).toBe('2026-01-02T03:04:05.000Z');
    expect(out.note).toHaveLength(2001);
  });
});

describe('fromExtendedJson', () => {
  it('turns $oid and $date into BSON values for a live filter', () => {
    const hex = '65a1b2c3d4e5f6a7b8c9d0e1';
    const out = fromExtendedJson<{ _id: mongoose.Types.ObjectId; at: Date }>({ _id: { $oid: hex }, at: { $date: '2026-01-01T00:00:00Z' } });
    expect(String(out._id)).toBe(hex);
    expect(out.at).toBeInstanceOf(Date);
  });
});

describe('previewUpdate', () => {
  it('applies $set, $unset and $inc (dotted paths too) to a copy', () => {
    const doc = { a: 1, b: { c: 2 }, d: 'x' };
    expect(previewUpdate(doc, { $set: { 'b.c': 5 }, $unset: { d: '' }, $inc: { a: 2 } })).toEqual({ a: 3, b: { c: 5 } });
    expect(doc).toEqual({ a: 1, b: { c: 2 }, d: 'x' });
  });

  it('answers null for operators it cannot simulate', () => {
    expect(previewUpdate({ a: [1] }, { $push: { a: 2 } })).toBeNull();
  });
});

describe('describeShape / typeName', () => {
  it('lists field paths with every type seen across samples', () => {
    const shape = describeShape([{ title: 'a', seats: 3, venue: { city: 'BLR' } }, { title: null, seats: 4 }]);
    expect(shape).toEqual(expect.arrayContaining([{ path: 'title', types: ['string', 'null'] }, { path: 'seats', types: ['number'] }, { path: 'venue.city', types: ['string'] }]));
  });

  it('names arrays, dates and ObjectIds', () => {
    expect(typeName([])).toBe('array');
    expect(typeName(new Date())).toBe('date');
    expect(typeName(new mongoose.Types.ObjectId())).toBe('ObjectId');
  });
});
