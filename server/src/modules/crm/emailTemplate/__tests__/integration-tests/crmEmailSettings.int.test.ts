import { Types } from 'mongoose';
import { CrmEmailSettingsModel } from '../../crmEmailSettings.model';
import {
  CRM_EMAIL_MAX_ASSETS,
  crmEmailSettingsService as svc,
  validateThemeInput,
  type BrandAssetInput,
} from '../../crmEmailSettings.service';
import { CRM_EMAIL_FONTS, CRM_EMAIL_THEME_DEFAULTS } from '../../crmEmailTheme';

/**
 * CRM › Email Templates › Settings: one settings document holding the theme,
 * the brand image library and the picked header logo.
 */

const logo = (over: BrandAssetInput = {}): BrandAssetInput => ({
  kind: 'LOGO',
  url: 'https://cdn.example.com/logo.png',
  name: 'Main logo',
  mime_type: 'image/png',
  ...over,
});
const banner = (over: BrandAssetInput = {}): BrandAssetInput => ({
  kind: 'BANNER',
  url: 'https://cdn.example.com/banner.jpg',
  name: 'Hero',
  mime_type: 'image/jpeg',
  width: 1200,
  height: 400,
  ...over,
});

const stored = () => CrmEmailSettingsModel.findOne({ key: 'default' }).lean();
const badInput = (message: string | RegExp) => ({
  message: typeof message === 'string' ? message : expect.stringMatching(message),
  extensions: { code: 'BAD_USER_INPUT' },
});
/** The error a synchronous call throws (validateThemeInput is not async). */
const thrown = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
};

describe('crmEmailSettingsService.get', () => {
  it('reads the defaults before anything is saved, without creating the document', async () => {
    const view = await svc.get();

    expect(view).toEqual({
      assets: [],
      primary_logo_id: null,
      theme: CRM_EMAIL_THEME_DEFAULTS,
      defaults: CRM_EMAIL_THEME_DEFAULTS,
      fonts: CRM_EMAIL_FONTS.map(({ key, label, stack }) => ({ key, label, stack })),
      updated_at: null,
    });
    // The stylesheet URLs stay on the server.
    expect(view.fonts.some((f) => 'href' in f)).toBe(false);
    expect(await CrmEmailSettingsModel.countDocuments()).toBe(0);
  });

  it('reads a picked logo whose asset has gone as no logo, never a broken image', async () => {
    await CrmEmailSettingsModel.create({ key: 'default', primary_logo_id: new Types.ObjectId() });
    expect((await svc.get()).primary_logo_id).toBeNull();
  });

  it('reads a bare stored asset (written without its optional fields) with blank details', async () => {
    const id = new Types.ObjectId();
    await CrmEmailSettingsModel.collection.insertOne({
      key: 'default',
      assets: [{ _id: id, kind: 'BANNER', url: 'https://cdn.example.com/old.png' }],
    });

    expect((await svc.get()).assets).toEqual([
      {
        id: String(id),
        kind: 'BANNER',
        url: 'https://cdn.example.com/old.png',
        name: '',
        mime_type: '',
        size_bytes: null,
        width: null,
        height: null,
        created_at: null,
      },
    ]);
    expect((await svc.renderContext()).brandImages).toBe('- Banner: untitled — https://cdn.example.com/old.png');
  });
});

describe('validateThemeInput', () => {
  it('normalises colours and passes valid fonts, sizes and mode through, skipping null fields', () => {
    expect(
      validateThemeInput({
        primary_color: '#ABC',
        dark_text_color: ' #EEEEEE ',
        accent_color: null,
        body_font: 'montserrat',
        heading_font: undefined,
        base_font_size: 18,
        button_radius: 0,
        color_mode: 'LIGHT',
      })
    ).toEqual({
      primary_color: '#aabbcc',
      dark_text_color: '#eeeeee',
      body_font: 'montserrat',
      base_font_size: 18,
      button_radius: 0,
      color_mode: 'LIGHT',
    });
    expect(validateThemeInput({})).toEqual({});
  });

  it.each([
    [{ primary_color: 'red' }, 'primary color must be a hex colour like #D92D2D'],
    [{ dark_background_color: '#12345' }, 'dark background color must be a hex colour like #D92D2D'],
    [{ heading_font: 'comic-sans' }, 'Unknown font "comic-sans"'],
    [{ base_font_size: 12 }, 'base font size must be a whole number from 13 to 18'],
    [{ base_font_size: 19 }, 'base font size must be a whole number from 13 to 18'],
    [{ content_padding: 24.5 }, 'content padding must be a whole number from 16 to 48'],
    [{ panel_radius: '8' }, 'panel radius must be a whole number from 0 to 28'],
    [{ button_radius: 29 }, 'button radius must be a whole number from 0 to 28'],
    [{ color_mode: 'DARK' }, 'Colour mode must be AUTO or LIGHT'],
  ])('refuses %p', (input, message) => {
    expect(thrown(() => validateThemeInput(input))).toMatchObject(badInput(message));
  });
});

describe('crmEmailSettingsService theme', () => {
  it('saves a partial change, keeps earlier fields, and records who changed it', async () => {
    const first = await svc.updateTheme({ primary_color: '#123456', base_font_size: 16 }, 'crm-1');
    expect(first.theme).toEqual({ ...CRM_EMAIL_THEME_DEFAULTS, primary_color: '#123456', base_font_size: 16 });
    expect(first.updated_at).toEqual(expect.any(String));

    const second = await svc.updateTheme({ heading_font: 'playfair' });
    expect(second.theme).toMatchObject({ primary_color: '#123456', base_font_size: 16, heading_font: 'playfair' });
    expect((await stored())?.updated_by).toBeNull();
  });

  it('writes nothing when the change is refused', async () => {
    await svc.updateTheme({ primary_color: '#123456' }, 'crm-1');
    await expect(svc.updateTheme({ accent_color: '#000000', base_font_size: 40 }, 'crm-2')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const doc = await stored();
    expect(doc?.theme).toMatchObject({ primary_color: '#123456' });
    expect(doc?.theme?.accent_color).toBeUndefined();
    expect(doc?.updated_by).toBe('crm-1');
  });

  it('resets the theme to the shared tokens but keeps the brand library', async () => {
    await svc.addAssets([logo()]);
    await svc.updateTheme({ primary_color: '#123456', color_mode: 'LIGHT' });

    const view = await svc.resetTheme('crm-1');

    expect(view.theme).toEqual(CRM_EMAIL_THEME_DEFAULTS);
    expect(view.assets).toHaveLength(1);
    expect((await stored())?.updated_by).toBe('crm-1');

    await svc.updateTheme({ primary_color: '#654321' }, 'crm-1');
    expect((await svc.resetTheme()).theme.primary_color).toBe(CRM_EMAIL_THEME_DEFAULTS.primary_color);
    expect((await stored())?.updated_by).toBeNull();
  });
});

describe('crmEmailSettingsService.addAssets', () => {
  it('stores validated images with their file details', async () => {
    const view = await svc.addAssets(
      [
        logo({ name: `  ${'L'.repeat(130)}  `, mime_type: ' IMAGE/PNG ', size_bytes: 2048.4 }),
        banner({ mime_type: null, size_bytes: -5, width: Number.NaN, height: 0 }),
      ],
      'crm-1'
    );

    expect(view.assets).toHaveLength(2);
    expect(view.assets[0]).toMatchObject({
      kind: 'LOGO',
      url: 'https://cdn.example.com/logo.png',
      name: 'L'.repeat(120),
      mime_type: 'image/png',
      size_bytes: 2048,
      width: null,
      height: null,
      created_at: expect.any(String),
    });
    expect(view.assets[0].id).toMatch(/^[0-9a-f]{24}$/);
    expect(view.assets[1]).toMatchObject({ kind: 'BANNER', name: 'Hero', mime_type: '', size_bytes: null, width: null, height: null });
    const doc = await stored();
    expect(doc?.assets.map((a) => a.created_by)).toEqual(['crm-1', 'crm-1']);
    expect(doc?.updated_by).toBe('crm-1');
  });

  it('appends to the library rather than replacing it', async () => {
    await svc.addAssets([logo()]);
    const view = await svc.addAssets([banner(), { kind: 'IMAGE', url: 'https://cdn.example.com/a.gif', mime_type: 'image/gif' }]);
    expect(view.assets.map((a: { kind: string }) => a.kind)).toEqual(['LOGO', 'BANNER', 'IMAGE']);
  });

  it.each([
    [[], 'Add at least one image'],
    [[logo({ url: 'http://cdn.example.com/logo.png' })], 'Images must be uploaded files served over https'],
    [[logo({ url: 'not a url' })], 'Images must be uploaded files served over https'],
    [[logo({ url: null })], 'Images must be uploaded files served over https'],
    [[logo({ mime_type: 'image/svg+xml' })], /PNG, JPG or GIF/],
    [[logo({ mime_type: 'image/webp' })], /PNG, JPG or GIF/],
    [[logo({ kind: 'VIDEO' })], 'Pick Logo, Banner or Image'],
    [[logo(), logo({ kind: null })], 'Pick Logo, Banner or Image'],
  ])('refuses %p and writes nothing', async (items, message) => {
    await expect(svc.addAssets(items as BrandAssetInput[])).rejects.toMatchObject(badInput(message));
    expect(await CrmEmailSettingsModel.countDocuments()).toBe(0);
  });

  it(`holds at most ${CRM_EMAIL_MAX_ASSETS} images`, async () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => banner({ name: `B${i}` }));
    await svc.addAssets(many(CRM_EMAIL_MAX_ASSETS - 1));

    await expect(svc.addAssets(many(2))).rejects.toMatchObject(badInput(/up to 100 images/));
    const full = await svc.addAssets(many(1));
    expect(full.assets).toHaveLength(CRM_EMAIL_MAX_ASSETS);
    await expect(svc.addAssets(many(1))).rejects.toMatchObject(badInput(/remove some first/));
  });
});

describe('crmEmailSettingsService.updateAsset', () => {
  it('renames, re-files and replaces the file of one asset, keeping its id', async () => {
    const { assets } = await svc.addAssets([banner(), logo()]);
    const id = assets[0].id;

    const renamed = await svc.updateAsset(id, { name: '  Spring hero  ' }, 'crm-2');
    expect(renamed.assets[0]).toMatchObject({ id, name: 'Spring hero', url: 'https://cdn.example.com/banner.jpg', width: 1200 });
    expect((await stored())?.updated_by).toBe('crm-2');

    const replaced = await svc.updateAsset(id, { url: 'https://cdn.example.com/new.gif', mime_type: 'image/gif', width: 600 });
    // A new file brings its own details; the ones it did not send are cleared, not kept from the old file.
    expect(replaced.assets[0]).toMatchObject({ id, url: 'https://cdn.example.com/new.gif', mime_type: 'image/gif', width: 600, height: null });

    const refiled = await svc.updateAsset(id, { kind: 'IMAGE' });
    expect(refiled.assets[0]).toMatchObject({ id, kind: 'IMAGE', name: 'Spring hero' });
    // The other asset is untouched.
    expect(refiled.assets[1]).toMatchObject({ kind: 'LOGO', name: 'Main logo' });
  });

  it('validates a replacement file and the kind', async () => {
    const { assets } = await svc.addAssets([banner()]);
    await expect(svc.updateAsset(assets[0].id, { url: 'http://x.example/a.png' })).rejects.toMatchObject(badInput(/https/));
    await expect(svc.updateAsset(assets[0].id, { url: 'https://x.example/a.svg', mime_type: 'image/svg+xml' })).rejects.toMatchObject(
      badInput(/PNG, JPG or GIF/)
    );
    await expect(svc.updateAsset(assets[0].id, { kind: 'VIDEO' })).rejects.toMatchObject(badInput('Pick Logo, Banner or Image'));
    expect((await svc.get()).assets[0]).toMatchObject({ url: 'https://cdn.example.com/banner.jpg', kind: 'BANNER' });
  });

  it('reports a malformed or unknown id as not found', async () => {
    await svc.addAssets([banner()]);
    await expect(svc.updateAsset('junk', { name: 'x' })).rejects.toMatchObject({
      message: 'Image not found',
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(svc.updateAsset(new Types.ObjectId().toHexString(), { name: 'x' })).rejects.toMatchObject({
      message: 'Image not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('un-picks the header logo when it is re-filed as something else, but not when it stays a logo', async () => {
    const { assets } = await svc.addAssets([logo(), logo({ name: 'Alt' })]);
    const [main, alt] = assets.map((a: { id: string }) => a.id);
    await svc.setPrimaryLogo(main);

    expect((await svc.updateAsset(main, { kind: 'LOGO', name: 'Main 2' })).primary_logo_id).toBe(main);
    // Re-filing a logo that is not the picked one leaves the pick alone.
    expect((await svc.updateAsset(alt, { kind: 'IMAGE' })).primary_logo_id).toBe(main);

    const view = await svc.updateAsset(main, { kind: 'BANNER' });
    expect(view.primary_logo_id).toBeNull();
    expect((await stored())?.primary_logo_id).toBeNull();
  });
});

describe('crmEmailSettingsService.removeAsset', () => {
  it('removes one asset and un-picks it as the logo in the same write', async () => {
    const { assets } = await svc.addAssets([logo(), banner()]);
    await svc.setPrimaryLogo(assets[0].id);

    const view = await svc.removeAsset(assets[0].id, 'crm-3');

    expect(view.assets.map((a: { id: string }) => a.id)).toEqual([assets[1].id]);
    expect(view.primary_logo_id).toBeNull();
    const doc = await stored();
    expect(doc?.primary_logo_id).toBeNull();
    expect(doc?.updated_by).toBe('crm-3');
  });

  it('keeps the picked logo when another asset is removed', async () => {
    const { assets } = await svc.addAssets([logo(), banner()]);
    await svc.setPrimaryLogo(assets[0].id);

    const view = await svc.removeAsset(assets[1].id);

    expect(view.primary_logo_id).toBe(assets[0].id);
    expect(view.assets).toHaveLength(1);
  });

  it('reports a missing asset', async () => {
    const { assets } = await svc.addAssets([banner()]);
    await svc.removeAsset(assets[0].id);
    await expect(svc.removeAsset(assets[0].id)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(svc.removeAsset('junk')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('crmEmailSettingsService.setPrimaryLogo', () => {
  it('picks an uploaded logo and puts the Duncit logo back with null', async () => {
    const { assets } = await svc.addAssets([logo()]);

    expect((await svc.setPrimaryLogo(assets[0].id, 'crm-1')).primary_logo_id).toBe(assets[0].id);
    expect((await stored())?.updated_by).toBe('crm-1');
    expect((await svc.setPrimaryLogo(null)).primary_logo_id).toBeNull();
  });

  it('works before any settings exist when clearing', async () => {
    expect((await svc.setPrimaryLogo(null)).primary_logo_id).toBeNull();
    expect(await CrmEmailSettingsModel.countDocuments()).toBe(1);
  });

  it('refuses a banner, an unknown id and a malformed id', async () => {
    const { assets } = await svc.addAssets([banner()]);
    await expect(svc.setPrimaryLogo(assets[0].id)).rejects.toMatchObject(badInput('Only an uploaded logo can be the email logo'));
    await expect(svc.setPrimaryLogo(new Types.ObjectId().toHexString())).rejects.toMatchObject(
      badInput('Only an uploaded logo can be the email logo')
    );
    await expect(svc.setPrimaryLogo('junk')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect((await stored())?.primary_logo_id).toBeNull();
  });
});

describe('crmEmailSettingsService.renderContext', () => {
  it('reads the defaults, no logo and no brand images before anything is set', async () => {
    expect(await svc.renderContext()).toEqual({
      theme: CRM_EMAIL_THEME_DEFAULTS,
      logoUrl: null,
      brandImages: 'None uploaded.',
    });
  });

  it('serves the theme, the picked logo and every non-logo image for the AI', async () => {
    const { assets } = await svc.addAssets([
      logo({ url: 'https://cdn.example.com/brand.png' }),
      banner(),
      { kind: 'IMAGE', url: 'https://cdn.example.com/team.jpg', width: 800 },
    ]);
    await svc.setPrimaryLogo(assets[0].id);
    await svc.updateTheme({ accent_color: '#00aa00' });

    const ctx = await svc.renderContext();

    expect(ctx.theme.accent_color).toBe('#00aa00');
    expect(ctx.logoUrl).toBe('https://cdn.example.com/brand.png');
    // The logo is not offered as an image to place; a size shows only when both sides are known.
    expect(ctx.brandImages).toBe(
      [
        '- Banner: Hero (1200x400) — https://cdn.example.com/banner.jpg',
        '- Image: untitled — https://cdn.example.com/team.jpg',
      ].join('\n')
    );
  });

  it('serves no logo when logos exist but none is picked', async () => {
    await svc.addAssets([logo()]);
    expect(await svc.renderContext()).toMatchObject({ logoUrl: null, brandImages: 'None uploaded.' });
  });
});
