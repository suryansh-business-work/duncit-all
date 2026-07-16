import { describe, expect, it } from 'vitest';
import { describeAttachment, typeLabel } from '@duncit/media-picker';

describe('describeAttachment', () => {
  it('classifies an image URL as an image with a decoded name', () => {
    const info = describeAttachment('https://ik.imagekit.io/x/support/My%20Photo.PNG?tr=w-200');
    expect(info.kind).toBe('image');
    expect(info.name).toBe('My Photo.PNG');
    expect(info.ext).toBe('png');
  });

  it('classifies a video URL as a video', () => {
    expect(describeAttachment('https://cdn/clip.mp4').kind).toBe('video');
    expect(describeAttachment('https://cdn/clip.mov').kind).toBe('video');
  });

  it('treats documents and extension-less files as docs', () => {
    expect(describeAttachment('https://cdn/report.pdf').kind).toBe('doc');
    expect(describeAttachment('https://cdn/sheet.xlsx').kind).toBe('doc');
    const noExt = describeAttachment('https://cdn/rawfile');
    expect(noExt.kind).toBe('doc');
    expect(noExt.ext).toBe('');
    expect(noExt.name).toBe('rawfile');
  });

  it('falls back to a generic name for a trailing-slash URL', () => {
    expect(describeAttachment('https://cdn/').name).toBe('Attachment');
  });
});

describe('typeLabel', () => {
  it('upper-cases a known extension and defaults to FILE', () => {
    expect(typeLabel('pdf')).toBe('PDF');
    expect(typeLabel('')).toBe('FILE');
  });
});
