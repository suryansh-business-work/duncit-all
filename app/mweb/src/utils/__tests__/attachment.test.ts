import { describe, expect, it } from 'vitest';
import { describeAttachment, isVideoUpload, typeLabel } from '../attachment';

describe('describeAttachment', () => {
  it('classifies an image URL with a decoded file name', () => {
    const info = describeAttachment('https://ik.imagekit.io/x/support/My%20Photo.PNG?tr=w-200');
    expect(info.kind).toBe('image');
    expect(info.name).toBe('My Photo.PNG');
    expect(info.ext).toBe('png');
  });

  it('classifies videos and documents', () => {
    expect(describeAttachment('https://cdn/clip.mp4').kind).toBe('video');
    expect(describeAttachment('https://cdn/report.pdf').kind).toBe('doc');
    expect(describeAttachment('https://cdn/sheet.xlsx').kind).toBe('doc');
  });

  it('handles extension-less and trailing-slash URLs', () => {
    const noExt = describeAttachment('https://cdn/rawfile');
    expect(noExt.kind).toBe('doc');
    expect(noExt.ext).toBe('');
    expect(describeAttachment('https://cdn/').name).toBe('Attachment');
  });
});

describe('typeLabel', () => {
  it('upper-cases a known extension and defaults to FILE', () => {
    expect(typeLabel('pdf')).toBe('PDF');
    expect(typeLabel('')).toBe('FILE');
  });
});

describe('isVideoUpload', () => {
  it('detects video by mime', () => {
    expect(isVideoUpload('clip', 'video/mp4')).toBe(true);
  });
  it('detects video by extension when the mime is empty/unknown', () => {
    expect(isVideoUpload('clip.mp4', '')).toBe(true);
    expect(isVideoUpload('movie.MKV', 'application/octet-stream')).toBe(true);
  });
  it('is false for images and documents', () => {
    expect(isVideoUpload('photo.png', 'image/png')).toBe(false);
    expect(isVideoUpload('report.pdf', 'application/pdf')).toBe(false);
  });
});
