import { makeContext } from '@test/harness';
import { uploadSettingResolvers } from '../../uploadSetting.resolver';
import { uploadSettingService, mediaScanService, DEFAULT_CROP_PRESETS } from '../../uploadSetting.service';
import { MediaScanLogModel, UploadSettingModel } from '../../uploadSetting.model';

const admin = () => makeContext({ roles: ['SUPER_ADMIN'] });
const member = () => makeContext({ roles: [] });

describe('uploadSetting integration', () => {
  it('seeds a surface with the researched crop presets on first read', async () => {
    const setting = await uploadSettingService.get('PORTALS');
    expect(setting.surface).toBe('PORTALS');
    expect(setting.default_crop_key).toBe('NO_CROP');
    expect(setting.crop_presets.map((p) => p.key)).toEqual(DEFAULT_CROP_PRESETS.map((p) => p.key));
    expect(setting.max_image_mb).toBe(15);
    expect(setting.max_video_mb).toBe(100);
    // Second read reuses the same row.
    await uploadSettingService.get('PORTALS');
    expect(await UploadSettingModel.countDocuments({ surface: 'PORTALS' })).toBe(1);
  });

  it('rejects an unknown surface', async () => {
    await expect(uploadSettingService.get('DESKTOP')).rejects.toThrow('Unknown upload surface');
  });

  it('lists all three surfaces for the admin pages', async () => {
    const all = await uploadSettingService.list();
    expect(all.map((s) => s.surface).sort()).toEqual(['MOBILE', 'MWEB', 'PORTALS']);
  });

  it('clamps numeric updates and normalises format lists', async () => {
    const updated = await uploadSettingService.update('MOBILE', {
      max_image_mb: 0,
      max_video_mb: 9999,
      image_quality: 150,
      video_crf: 10,
      allowed_image_formats: ['.PNG', 'jpg', 'bad ext!', 'jpg'],
    });
    expect(updated.max_image_mb).toBe(1);
    expect(updated.max_video_mb).toBe(500);
    expect(updated.image_quality).toBe(100);
    expect(updated.video_crf).toBe(18);
    expect(updated.allowed_image_formats).toEqual(['png', 'jpg']);
  });

  it('only accepts a default_crop_key that matches a preset', async () => {
    await expect(
      uploadSettingService.update('PORTALS', { default_crop_key: 'NOPE' }),
    ).rejects.toThrow('default_crop_key must match a crop preset');
    const updated = await uploadSettingService.update('PORTALS', { default_crop_key: 'pod_feature' });
    expect(updated.default_crop_key).toBe('POD_FEATURE');
  });

  it('replaces crop presets (invalid entries dropped) and toggles flags', async () => {
    const updated = await uploadSettingService.update('PORTALS', {
      image_compression_enabled: false,
      ai_image_monitoring_enabled: false,
      crop_presets: [
        { key: 'no_crop', label: 'No Crop', width: 0, height: 0 },
        { key: '  ', label: 'dropped' },
        { key: 'wide', width: 3000, height: 1000, enabled: false },
      ],
      default_crop_key: 'NO_CROP',
    });
    expect(updated.image_compression_enabled).toBe(false);
    expect(updated.ai_image_monitoring_enabled).toBe(false);
    expect(updated.crop_presets.map((p) => p.key)).toEqual(['NO_CROP', 'WIDE']);
    expect(updated.crop_presets[1].enabled).toBe(false);
  });

  it('guards the resolvers (auth for surface read, roles for admin ops)', async () => {
    await expect(
      (async () =>
        (uploadSettingResolvers.Query as any).uploadSettings({}, { surface: 'PORTALS' }, makeContext(null)))(),
    ).rejects.toThrow();
    await expect(
      (async () => (uploadSettingResolvers.Query as any).allUploadSettings({}, {}, member()))(),
    ).rejects.toThrow();
    await expect(
      (async () =>
        (uploadSettingResolvers.Mutation as any).updateUploadSettings(
          {},
          { surface: 'PORTALS', input: {} },
          member(),
        ))(),
    ).rejects.toThrow();
    const viaAdmin = await (uploadSettingResolvers.Query as any).allUploadSettings({}, {}, admin());
    expect(viaAdmin).toHaveLength(3);
  });

  it('migrates the retired MOBILE_MWEB row into MOBILE + MWEB, preserving config', async () => {
    // Simulate a pre-split deployment: an admin-tuned MOBILE_MWEB row already
    // exists in the DB. Insert it RAW (the enum now rejects it on save, but the
    // real migration only ever READS the legacy row — validation runs on save).
    await UploadSettingModel.collection.insertOne({
      surface: 'MOBILE_MWEB',
      max_image_mb: 42,
      max_video_mb: 100,
      allowed_image_formats: ['jpg', 'webp'],
      allowed_video_formats: ['mp4'],
      image_compression_enabled: true,
      image_quality: 80,
      image_max_dimension: 1920,
      video_compression_enabled: false,
      video_crf: 28,
      video_max_height: 1080,
      ai_image_monitoring_enabled: true,
      default_crop_key: 'NO_CROP',
      crop_presets: DEFAULT_CROP_PRESETS,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const mobile = await uploadSettingService.get('MOBILE');
    const mweb = await uploadSettingService.get('MWEB');
    expect(mobile.max_image_mb).toBe(42);
    expect(mweb.max_image_mb).toBe(42);
    expect(mobile.allowed_image_formats).toEqual(['jpg', 'webp']);
  });

  it('records an image scan row when monitoring is on, skips when off', async () => {
    await mediaScanService.record({
      url: 'https://ik.imagekit.io/x/a.jpg',
      fileName: 'a.jpg',
      folder: '/pods',
      surface: 'MOBILE',
      userId: null,
    });
    expect(await MediaScanLogModel.countDocuments()).toBe(1);

    await uploadSettingService.update('MOBILE', { ai_image_monitoring_enabled: false });
    await mediaScanService.record({
      url: 'https://ik.imagekit.io/x/b.jpg',
      surface: 'MOBILE',
    });
    expect(await MediaScanLogModel.countDocuments()).toBe(1);
  });

  it('serves the scan log through the shared table engine', async () => {
    await MediaScanLogModel.create({
      url: 'https://ik.imagekit.io/x/c.jpg',
      file_name: 'c.jpg',
      folder: '/posts',
      surface: 'PORTALS',
      risk: 'HIGH',
      summary: 'test row',
    });
    const page = await (uploadSettingResolvers.Query as any).mediaScanLogsTable(
      {},
      { query: { page: 1, page_size: 10 } },
      admin(),
    );
    expect(page.total).toBe(1);
    expect(page.rows[0].risk).toBe('HIGH');
    expect(page.rows[0].url).toContain('c.jpg');
  });
});
