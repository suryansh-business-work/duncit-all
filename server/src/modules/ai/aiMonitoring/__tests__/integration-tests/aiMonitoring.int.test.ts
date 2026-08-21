import { makeContext } from '@test/harness';
import { uploadSettingService } from '@modules/platform/uploadSetting/uploadSetting.service';
import { aiMonitoringResolvers } from '../../aiMonitoring.resolver';
import { mediaScanService } from '../../aiMonitoring.service';
import { MediaScanLogModel } from '../../aiMonitoring.model';

const admin = () => makeContext({ roles: ['SUPER_ADMIN'] });

describe('aiMonitoring integration', () => {
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

  it('serves the monitoring log through the shared table engine', async () => {
    await MediaScanLogModel.create({
      url: 'https://ik.imagekit.io/x/c.jpg',
      file_name: 'c.jpg',
      folder: '/posts',
      surface: 'PORTALS',
      risk: 'HIGH',
      status: 'COMPLETED',
      action: 'FLAGGED',
      summary: 'test row',
    });
    const page = await (aiMonitoringResolvers.Query as any).aiMonitoringLogsTable(
      {},
      { query: { page: 1, page_size: 10 } },
      admin(),
    );
    expect(page.total).toBe(1);
    expect(page.rows[0].risk).toBe('HIGH');
    expect(page.rows[0].action).toBe('FLAGGED');
    expect(page.rows[0].url).toContain('c.jpg');
  });
});
