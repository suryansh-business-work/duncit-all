import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { CODE_PROMPT_BY_KEY } from '@modules/ai/prompt/catalog';
import { uploadSettingService } from '@modules/platform/uploadSetting/uploadSetting.service';
import { aiMonitoringResolvers } from '../../aiMonitoring.resolver';
import {
  IMAGE_SCAN_PROMPT_KEY,
  aiMonitoringSettingService,
  mediaScanService,
} from '../../aiMonitoring.service';
import { AiMonitoringSettingModel, MediaScanLogModel } from '../../aiMonitoring.model';

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

  it('logs and swallows a failure while recording, writing no row', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const getSetting = jest.spyOn(uploadSettingService, 'get').mockRejectedValueOnce(new Error('settings down'));
    try {
      await expect(
        mediaScanService.record({ url: 'https://ik.imagekit.io/x/d.jpg', surface: 'MOBILE' }),
      ).resolves.toBeUndefined();

      expect(await MediaScanLogModel.countDocuments()).toBe(0);
      expect(logError).toHaveBeenCalledWith(
        'aiMonitoring',
        'record',
        expect.objectContaining({ msg: 'record failed' }),
      );
    } finally {
      getSetting.mockRestore();
      logError.mockRestore();
    }
  });
});

describe('aiMonitoring logs table — User/Entity column', () => {
  const row = (file: string, user_id?: string) =>
    MediaScanLogModel.create({ url: `https://ik.imagekit.io/x/${file}`, file_name: file, user_id });

  it('names the uploader by full name, else email, else id, and leaves unknown owners blank', async () => {
    const named = await UserModel.create({
      auth: { email: `scan-named-${Date.now()}@duncit.com` },
      profile: { first_name: 'Asha', last_name: 'Rao' },
    });
    // Legacy shapes, written raw: one with an email but no name, one with neither.
    const emailOnlyId = new Types.ObjectId();
    const email = `scan-mail-${Date.now()}@duncit.com`;
    await UserModel.collection.insertOne({ _id: emailOnlyId, auth: { email }, profile: { first_name: '  ' } });
    const bareId = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: bareId });
    const missingId = String(new Types.ObjectId());

    await row('named.jpg', String(named._id));
    await row('named-again.jpg', String(named._id));
    await row('mail.jpg', String(emailOnlyId));
    await row('bare.jpg', String(bareId));
    await row('missing.jpg', missingId);
    await row('garbage.jpg', 'not-an-id');
    await row('anon.jpg');

    const page = await mediaScanService.table({ page: 1, page_size: 20 });
    const byFile = new Map(page.rows.map((r) => [r.file_name, r]));

    expect(page.total).toBe(7);
    expect(byFile.get('named.jpg')?.entity).toBe('Asha Rao');
    expect(byFile.get('named-again.jpg')?.entity).toBe('Asha Rao');
    expect(byFile.get('mail.jpg')?.entity).toBe(email);
    expect(byFile.get('bare.jpg')?.entity).toBe(String(bareId));
    expect(byFile.get('missing.jpg')?.entity).toBeNull();
    expect(byFile.get('garbage.jpg')).toMatchObject({ user_id: 'not-an-id', entity: null });
    expect(byFile.get('anon.jpg')).toMatchObject({ user_id: null, entity: null, checked_at: null });
  });

  it('skips the user lookup entirely when no row carries a valid owner id', async () => {
    await row('garbage.jpg', 'not-an-id');
    const find = jest.spyOn(UserModel, 'find');
    try {
      const page = await mediaScanService.table({ page: 1, page_size: 20 });

      expect(page.rows).toEqual([expect.objectContaining({ file_name: 'garbage.jpg', entity: null })]);
      expect(find).not.toHaveBeenCalled();
    } finally {
      find.mockRestore();
    }
  });
});

describe('aiMonitoringSettingService', () => {
  const catalogPrompt = CODE_PROMPT_BY_KEY.get(IMAGE_SCAN_PROMPT_KEY)?.content;

  it('creates the singleton on first read and returns the same row after', async () => {
    const first = await aiMonitoringSettingService.get();
    const second = await aiMonitoringSettingService.get();

    expect(first.key).toBe('default');
    expect(String(second._id)).toBe(String(first._id));
    expect(await AiMonitoringSettingModel.countDocuments()).toBe(1);
  });

  it('serves trimmed copy, null for blank fields, and drops blank dialog points', async () => {
    await AiMonitoringSettingModel.create({
      key: 'default',
      chip_enabled: false,
      chip_label: '  AI checked  ',
      dialog_title: '   ',
      dialog_intro: 'Intro',
      dialog_points: ['  one  ', '   ', 'two'],
      dialog_footnote: '',
      dismiss_label: ' Got it ',
    });

    await expect(aiMonitoringSettingService.publicConfig()).resolves.toEqual({
      chip_enabled: false,
      chip_label: 'AI checked',
      dialog_title: null,
      dialog_intro: 'Intro',
      dialog_points: ['one', 'two'],
      dialog_footnote: null,
      dismiss_label: 'Got it',
    });
  });

  it('shows the catalogue prompt and default model while the library row is not seeded', async () => {
    const settings = await aiMonitoringSettingService.adminSettings();

    expect(catalogPrompt).toBeTruthy();
    expect(settings).toMatchObject({
      image_prompt: catalogPrompt,
      image_prompt_id: null,
      image_prompt_key: IMAGE_SCAN_PROMPT_KEY,
      image_scan_model: 'gpt-4o-mini',
    });
  });

  it('shows the library row prompt and model once it exists', async () => {
    const prompt = await AiPromptModel.create({
      key: IMAGE_SCAN_PROMPT_KEY,
      kind: 'CODE',
      name: 'Image upload risk scan',
      content: '  Judge strictly.  ',
      target_model: 'gpt-4.1-mini',
    });

    const settings = await aiMonitoringSettingService.adminSettings();

    expect(settings).toMatchObject({
      image_prompt: 'Judge strictly.',
      image_prompt_id: String(prompt._id),
      image_scan_model: 'gpt-4.1-mini',
    });
  });

  it('falls back to the catalogue body when the library row body is blank', async () => {
    await AiPromptModel.create({ key: IMAGE_SCAN_PROMPT_KEY, kind: 'CODE', name: 'Image scan', content: '   ' });

    const settings = await aiMonitoringSettingService.adminSettings();

    expect(settings.image_prompt).toBe(catalogPrompt);
    expect(settings.image_scan_model).toBe('gpt-4o-mini');
  });

  it('saves every supplied field with its length caps and writes the prompt to the library row', async () => {
    await AiPromptModel.create({ key: IMAGE_SCAN_PROMPT_KEY, kind: 'CODE', name: 'Image scan', content: 'old' });
    const points = ['  first  ', '', ...Array.from({ length: 14 }, (_, i) => `point ${i}`), 'x'.repeat(400)];

    const result = await aiMonitoringSettingService.update({
      chip_enabled: false,
      chip_label: 'L'.repeat(100),
      dialog_title: 'T'.repeat(200),
      dialog_intro: 'I'.repeat(1200),
      dialog_points: points,
      dialog_footnote: 'F'.repeat(600),
      dismiss_label: 'D'.repeat(80),
      image_prompt: '  New prompt body  ',
    });

    const saved = await AiMonitoringSettingModel.findOne({ key: 'default' }).lean();
    expect(saved).toMatchObject({
      chip_enabled: false,
      chip_label: 'L'.repeat(80),
      dialog_title: 'T'.repeat(160),
      dialog_intro: 'I'.repeat(1000),
      dialog_footnote: 'F'.repeat(500),
      dismiss_label: 'D'.repeat(60),
    });
    // Trimmed, blanks dropped, capped at 12 points.
    expect(saved?.dialog_points).toEqual(['first', ...Array.from({ length: 11 }, (_, i) => `point ${i}`)]);
    const prompt = await AiPromptModel.findOne({ key: IMAGE_SCAN_PROMPT_KEY }).lean();
    expect(prompt?.content).toBe('New prompt body');
    expect(result.image_prompt).toBe('New prompt body');
  });

  it('leaves fields alone when they are null and ignores a blank prompt', async () => {
    await AiMonitoringSettingModel.create({ key: 'default', chip_label: 'Keep me', dialog_points: ['stay'] });
    await AiPromptModel.create({ key: IMAGE_SCAN_PROMPT_KEY, kind: 'CODE', name: 'Image scan', content: 'Keep' });

    const result = await aiMonitoringSettingService.update({
      chip_enabled: null,
      chip_label: null,
      dialog_points: null,
      image_prompt: '   ',
    });

    expect(result).toMatchObject({ chip_enabled: true, chip_label: 'Keep me', dialog_points: ['stay'] });
    const prompt = await AiPromptModel.findOne({ key: IMAGE_SCAN_PROMPT_KEY }).lean();
    expect(prompt?.content).toBe('Keep');
  });
});
