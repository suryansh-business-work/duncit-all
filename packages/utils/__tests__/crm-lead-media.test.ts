import { describe, expect, it } from 'vitest';
import {
  CRM_LEAD_MEDIA_GROUPS,
  CRM_LEAD_MEDIA_LIMITS,
  CRM_LEAD_MEDIA_TYPES,
  crmImageMeta,
  crmMediaBytes,
  crmOtherMediaKind,
} from '../src/crm-lead-media';

/** A lead's Logos & Images: the groups, their caps and how a file is described. */

describe('lead media groups', () => {
  it('keeps logos first, each with its own copy and the other group as its move target', () => {
    expect(CRM_LEAD_MEDIA_GROUPS.map((g) => g.kind)).toEqual(['LOGO', 'IMAGE']);
    expect(CRM_LEAD_MEDIA_GROUPS[0]).toMatchObject({ moveKey: 'crm.media.moveToImages', fit: 'contain' });
    expect(CRM_LEAD_MEDIA_GROUPS[1]).toMatchObject({ moveKey: 'crm.media.moveToLogos', fit: 'cover' });
  });

  it('caps logos at 10 and images at 50, and takes the image types the server takes', () => {
    expect(CRM_LEAD_MEDIA_LIMITS).toEqual({ LOGO: 10, IMAGE: 50 });
    expect(CRM_LEAD_MEDIA_TYPES).toContain('image/svg+xml');
  });

  it('moves a logo to images and an image to logos', () => {
    expect(crmOtherMediaKind('LOGO')).toBe('IMAGE');
    expect(crmOtherMediaKind('IMAGE')).toBe('LOGO');
  });
});

describe('crmMediaBytes', () => {
  it('reads bytes, whole kilobytes and one-decimal megabytes', () => {
    expect(crmMediaBytes(512)).toBe('512 B');
    expect(crmMediaBytes(2048)).toBe('2 KB');
    expect(crmMediaBytes(1536 * 1024)).toBe('1.5 MB');
  });
});

describe('crmImageMeta', () => {
  it('joins the type, the pixel size and the file size', () => {
    expect(crmImageMeta({ mime_type: 'image/png', width: 512, height: 256, size_bytes: 2048 })).toBe('PNG · 512×256 · 2 KB');
    expect(crmImageMeta({ mime_type: 'image/svg+xml' })).toBe('SVG');
  });

  it('leaves out whatever is unknown', () => {
    expect(crmImageMeta({ width: 10, height: null, size_bytes: 0 })).toBe('');
    expect(crmImageMeta({})).toBe('');
  });
});
