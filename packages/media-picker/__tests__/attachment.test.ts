import { describe, expect, it } from 'vitest';

import {
  ATTACHMENT_ACCEPT_ALL,
  describeAttachment,
  isVideoUpload,
  typeLabel,
} from '../src/attachment';

const CDN = 'https://ik.imagekit.io/duncit/support';

describe('describeAttachment', () => {
  it('reads the name and extension out of the URL, since attachments carry no metadata', () => {
    expect(describeAttachment(`${CDN}/receipt.PDF`)).toEqual({
      url: `${CDN}/receipt.PDF`,
      name: 'receipt.PDF',
      ext: 'pdf',
      kind: 'doc',
    });
  });

  it('ignores an ImageKit query string when finding the file name', () => {
    expect(describeAttachment(`${CDN}/cover.jpg?tr=w-400,h-300`)).toMatchObject({
      name: 'cover.jpg',
      ext: 'jpg',
      kind: 'image',
    });
  });

  it('decodes a percent-encoded name so a person reads what they uploaded', () => {
    expect(describeAttachment(`${CDN}/my%20invoice%20(1).pdf`).name).toBe('my invoice (1).pdf');
  });

  it.each(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'heic'])(
    'classifies .%s as an image',
    (ext) => {
      expect(describeAttachment(`${CDN}/file.${ext}`).kind).toBe('image');
    }
  );

  it.each(['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', '3gp'])('classifies .%s as a video', (ext) => {
    expect(describeAttachment(`${CDN}/clip.${ext}`).kind).toBe('video');
  });

  it.each(['pdf', 'docx', 'xlsx', 'txt', 'csv', 'zip'])('falls back to a document card for .%s', (ext) => {
    expect(describeAttachment(`${CDN}/file.${ext}`).kind).toBe('doc');
  });

  it('treats an extensionless URL as a document with no extension', () => {
    expect(describeAttachment(`${CDN}/rawfile`)).toMatchObject({ name: 'rawfile', ext: '', kind: 'doc' });
  });

  it('names a URL that ends in a slash rather than showing an empty card', () => {
    expect(describeAttachment(`${CDN}/`).name).toBe('Attachment');
  });

  it('ignores the case an extension was typed in', () => {
    expect(describeAttachment(`${CDN}/CLIP.MOV`).kind).toBe('video');
  });

  it('keeps the original url untouched on the result', () => {
    const url = `${CDN}/cover.jpg?tr=w-400`;

    expect(describeAttachment(url).url).toBe(url);
  });
});

describe('typeLabel', () => {
  it('upper-cases the extension for the document card', () => {
    expect(typeLabel('pdf')).toBe('PDF');
  });

  it('says FILE rather than nothing when there is no extension', () => {
    expect(typeLabel('')).toBe('FILE');
  });
});

describe('isVideoUpload', () => {
  it('trusts a video MIME type', () => {
    expect(isVideoUpload('anything.bin', 'video/mp4')).toBe(true);
    expect(isVideoUpload('anything.bin', 'VIDEO/QUICKTIME')).toBe(true);
  });

  it('falls back to the extension, because browsers report nothing for the odd container', () => {
    expect(isVideoUpload('clip.mkv', '')).toBe(true);
    expect(isVideoUpload('clip.mov', 'application/octet-stream')).toBe(true);
  });

  it('is false for an image or a document, so they keep the larger size cap', () => {
    expect(isVideoUpload('cover.jpg', 'image/jpeg')).toBe(false);
    expect(isVideoUpload('receipt.pdf', 'application/pdf')).toBe(false);
  });
});

describe('ATTACHMENT_ACCEPT_ALL', () => {
  it('accepts every kind the support surfaces take', () => {
    for (const part of ['image/*', 'video/*', 'application/pdf', '.docx', '.xlsx', '.csv']) {
      expect(ATTACHMENT_ACCEPT_ALL).toContain(part);
    }
  });
});
