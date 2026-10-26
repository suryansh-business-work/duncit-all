/**
 * Upload settings, the parts the main suite leaves out: how any inbound surface
 * string is read, every field an admin can change (clamped, never trusted),
 * the formats and presets that are refused, and the read and write resolvers.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { normalizeSurface } from '../../uploadSetting.model';
import { uploadSettingResolvers } from '../../uploadSetting.resolver';
import { uploadSettingService as service } from '../../uploadSetting.service';

const Q = uploadSettingResolvers.Query as Record<string, (...a: any[]) => any>;
const M = uploadSettingResolvers.Mutation as Record<string, (...a: any[]) => any>;
const owner = makeContext({ id: new Types.ObjectId().toString(), roles: ['TECH_MANAGER'] });
const reader = makeContext({ id: new Types.ObjectId().toString(), roles: ['SUPPORT_USER'] });
const member = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });

describe('normalizeSurface', () => {
  it.each([
    ['PORTALS', 'PORTALS'], [' portals ', 'PORTALS'], ['mweb', 'MWEB'], ['MWEB', 'MWEB'], ['MOBILE', 'MOBILE'],
    ['MOBILE_MWEB', 'MOBILE'], ['desktop', 'MOBILE'], ['', 'MOBILE'], [null, 'MOBILE'], [undefined, 'MOBILE'],
  ])('reads %j as %s', (raw, expected) => {
    expect(normalizeSurface(raw as string | null | undefined)).toBe(expected);
  });
});

describe('update', () => {
  it('changes every field it is given, clamping numbers into their allowed range and rounding them', async () => {
    const out = await service.update('PORTALS', {
      max_image_mb: 0, max_video_mb: 9999, image_quality: 150.4, image_max_dimension: 100, video_crf: 5, video_max_height: 99999,
      image_compression_enabled: false, video_compression_enabled: true, ai_image_monitoring_enabled: false,
    });
    expect(out).toMatchObject({
      max_image_mb: 1, max_video_mb: 500, image_quality: 100, image_max_dimension: 320, video_crf: 18, video_max_height: 4320,
      image_compression_enabled: false, video_compression_enabled: true, ai_image_monitoring_enabled: false,
    });
    const low = await service.update('PORTALS', { max_image_mb: 500, max_video_mb: 0, image_quality: -3, image_max_dimension: 99999, video_crf: 99, video_max_height: 10 });
    expect(low).toMatchObject({ max_image_mb: 100, max_video_mb: 1, image_quality: 1, image_max_dimension: 8192, video_crf: 40, video_max_height: 240 });
    const fractional = await service.update('PORTALS', { max_image_mb: 7.6 });
    expect(fractional.max_image_mb).toBe(8);
  });

  it('keeps what it is not given', async () => {
    await service.update('MWEB', { max_image_mb: 20, video_compression_enabled: true });
    const after = await service.update('MWEB', { image_quality: 60 });
    expect(after).toMatchObject({ max_image_mb: 20, video_compression_enabled: true, image_quality: 60 });
  });

  it('cleans the format lists: lower-case, no leading dot, no duplicates, nothing that is not an extension', async () => {
    const out = await service.update('PORTALS', {
      allowed_image_formats: ['.JPG', 'png', 'PNG', ' webp ', 'x', 'toolongext', 'bad!'],
      allowed_video_formats: ['MP4', '.mov'],
    });
    expect(out.allowed_image_formats).toEqual(['jpg', 'png', 'webp']);
    expect(out.allowed_video_formats).toEqual(['mp4', 'mov']);
  });

  it('keeps the current formats when the new list has nothing usable or is not a list', async () => {
    const before = await service.update('PORTALS', { allowed_image_formats: ['png'], allowed_video_formats: ['mp4'] });
    const after = await service.update('PORTALS', { allowed_image_formats: ['x', '!!'], allowed_video_formats: [] });
    expect(after.allowed_image_formats).toEqual(before.allowed_image_formats);
    expect(after.allowed_video_formats).toEqual(before.allowed_video_formats);
    const notList = await service.update('PORTALS', { allowed_image_formats: 'png' as never, allowed_video_formats: null as never });
    expect(notList.allowed_image_formats).toEqual(['png']);
    expect(notList.allowed_video_formats).toEqual(['mp4']);
  });

  it('names a preset after its key when it has no label, trims and caps what it stores, and bounds its size', async () => {
    const out = await service.update('PORTALS', {
      crop_presets: [{ key: ' banner ' }, { key: 'k'.repeat(60), label: 'L'.repeat(120), width: 99999, height: -5, enabled: true }, { key: 'half', width: Number.NaN, height: 10.6 }],
      default_crop_key: 'banner',
    });
    expect(out.crop_presets[0]).toMatchObject({ key: 'BANNER', label: 'banner', width: 0, height: 0, enabled: true });
    expect(out.crop_presets[1].key).toHaveLength(40);
    expect(out.crop_presets[1].label).toHaveLength(80);
    expect(out.crop_presets[1]).toMatchObject({ width: 8192, height: 0 });
    expect(out.crop_presets[2]).toMatchObject({ key: 'HALF', width: 0, height: 11 });
    expect(out.default_crop_key).toBe('BANNER');
  });

  it('keeps the current presets when none of the new ones has a key', async () => {
    const before = await service.get('PORTALS');
    const after = await service.update('PORTALS', { crop_presets: [{ label: 'no key' }, { key: '  ' }] });
    expect(after.crop_presets.map((p) => p.key)).toEqual(before.crop_presets.map((p) => p.key));
  });
});

describe('the resolvers', () => {
  it('lets any signed-in account read a surface, and only admin roles read them all or change them', async () => {
    await expect(Q.uploadSettings({}, { surface: 'MWEB' }, member)).resolves.toMatchObject({ surface: 'MWEB' });
    await expect(Q.allUploadSettings({}, {}, reader)).resolves.toHaveLength(3);
    await expect(M.updateUploadSettings({}, { surface: 'MWEB', input: { max_image_mb: 30 } }, owner)).resolves.toMatchObject({ max_image_mb: 30 });
    expect(() => M.updateUploadSettings({}, { surface: 'MWEB', input: { max_image_mb: 30 } }, reader)).toThrow(/access denied/i);
    expect(() => Q.allUploadSettings({}, {}, member)).toThrow(/access denied/i);
    expect(() => Q.uploadSettings({}, { surface: 'MWEB' }, makeContext(null))).toThrow();
  });
});
