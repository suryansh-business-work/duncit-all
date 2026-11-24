import { crc32 } from 'node:zlib';
import { zipStore } from '@utils/zip-store';
import { readZip } from '../zip-reader';

describe('zipStore', () => {
  it('stores every entry uncompressed, with its name, bytes and CRC intact', () => {
    const files = [
      { name: 'pass.json', data: Buffer.from('{"formatVersion":1}') },
      { name: 'icon@2x.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 255]) },
      { name: 'empty.txt', data: Buffer.alloc(0) },
    ];
    const entries = readZip(zipStore(files));

    expect(entries.map((e) => e.name)).toEqual(['pass.json', 'icon@2x.png', 'empty.txt']);
    entries.forEach((entry, i) => {
      expect(entry.method).toBe(0);
      expect(entry.data.equals(files[i].data)).toBe(true);
      expect(entry.crc).toBe(crc32(files[i].data));
    });
  });

  it('keeps a UTF-8 entry name readable', () => {
    const [entry] = readZip(zipStore([{ name: 'café.txt', data: Buffer.from('x') }]));
    expect(entry.name).toBe('café.txt');
  });

  it('produces the same bytes for the same input', () => {
    const files = [{ name: 'a', data: Buffer.from('hello') }];
    expect(zipStore(files).equals(zipStore(files))).toBe(true);
  });

  it('writes a valid empty archive', () => {
    const zip = zipStore([]);
    expect(zip.length).toBe(22);
    expect(readZip(zip)).toEqual([]);
  });
});
