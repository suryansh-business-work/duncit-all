import { createHash } from 'node:crypto';
import mongoose, { Types } from 'mongoose';

/**
 * File bytes in the `intel_media` GridFS bucket of the app database. Private
 * by construction: the only way out is the authenticated download route,
 * which checks the file's visibility for the person asking.
 */

const BUCKET = 'intel_media';

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('The database is not connected');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

export const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

export function putFile(data: Buffer, name: string, mime: string): Promise<Types.ObjectId> {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(name, { metadata: { mime } });
    upload.once('error', reject);
    upload.once('finish', () => resolve(upload.id as Types.ObjectId));
    upload.end(data);
  });
}

export async function readFile(id: Types.ObjectId): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of bucket().openDownloadStream(id)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export const streamFile = (id: Types.ObjectId) => bucket().openDownloadStream(id);

export async function deleteFile(id: Types.ObjectId): Promise<void> {
  await bucket().delete(id);
}
