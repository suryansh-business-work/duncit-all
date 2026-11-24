/**
 * Test helper: read a STORED zip the way an unzipper does — from the
 * end-of-directory record, through the central directory, to each local
 * entry — and throw on any structural mismatch. Shared by the zip writer's
 * tests and the Apple Wallet pass tests, which need to look inside a .pkpass.
 */
export interface ReadZipEntry {
  name: string;
  data: Buffer;
  crc: number;
  method: number;
}

const expectSignature = (zip: Buffer, offset: number, signature: number, what: string) => {
  if (zip.readUInt32LE(offset) !== signature) throw new Error(`No ${what} signature at ${offset}`);
};

export function readZip(zip: Buffer): ReadZipEntry[] {
  const end = zip.length - 22;
  expectSignature(zip, end, 0x06054b50, 'end-of-directory');
  const count = zip.readUInt16LE(end + 10);
  const dirSize = zip.readUInt32LE(end + 12);
  let cursor = zip.readUInt32LE(end + 16);
  if (cursor + dirSize !== end) throw new Error('Central directory does not end at the end record');
  const entries: ReadZipEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    expectSignature(zip, cursor, 0x02014b50, 'central directory');
    const method = zip.readUInt16LE(cursor + 10);
    const crc = zip.readUInt32LE(cursor + 16);
    const size = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');

    expectSignature(zip, localOffset, 0x04034b50, 'local header');
    if (zip.readUInt32LE(localOffset + 14) !== crc) throw new Error(`Local CRC of ${name} differs`);
    const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26);
    entries.push({ name, data: zip.subarray(dataStart, dataStart + size), crc, method });
    cursor += 46 + nameLength;
  }
  return entries;
}

/** The archive as name → bytes. */
export const zipFiles = (zip: Buffer): Record<string, Buffer> =>
  Object.fromEntries(readZip(zip).map((entry) => [entry.name, entry.data]));
