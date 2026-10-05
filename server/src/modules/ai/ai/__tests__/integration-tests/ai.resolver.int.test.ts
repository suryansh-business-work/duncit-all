import { makeContext } from '@test/harness';
import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { importRemoteImage, pexelsSearch } from '@modules/platform/upload/upload.service';
import { analyticsService } from '@modules/platform/analytics/analytics.service';
import { UserModel } from '@modules/access/user/user.model';
import { aiResolvers } from '../../ai.resolver';
import { buildFillReference, resolveClubReferences } from '../../ai-fill-context';

// Every external call the AI mutations make is replaced: the model, the stock
// photo search + import, and the reference lookups. The prompt library is
// replaced too so the assertions can read exactly what reached the model.
jest.mock('@services/openai/openai.client', () => ({
  ...jest.requireActual('@services/openai/openai.client'),
  openaiChat: jest.fn(),
}));
jest.mock('@modules/ai/prompt/prompt.service', () => ({
  ...jest.requireActual('@modules/ai/prompt/prompt.service'),
  resolvePrompt: jest.fn(),
}));
jest.mock('@modules/platform/upload/upload.service', () => ({
  ...jest.requireActual('@modules/platform/upload/upload.service'),
  pexelsSearch: jest.fn(),
  importRemoteImage: jest.fn(),
}));
jest.mock('../../ai-fill-context', () => ({ buildFillReference: jest.fn(), resolveClubReferences: jest.fn() }));

const M = aiResolvers.Mutation;
const mockChat = openaiChat as jest.Mock;
const mockPrompt = resolvePrompt as jest.Mock;
const mockPexels = pexelsSearch as jest.Mock;
const mockImport = importRemoteImage as jest.Mock;
const mockReference = buildFillReference as jest.Mock;
const mockClubRefs = resolveClubReferences as jest.Mock;

const admin = () => makeContext({ roles: ['SUPER_ADMIN'] });
const plainUser = () => makeContext({ roles: ['USER'] });

const ok = (content: string) => mockChat.mockResolvedValue({ ok: true, content, model: 'gpt-4o-mini' });
const fail = (code: string, message = 'boom', status = 500) =>
  mockChat.mockResolvedValue({ ok: false, code, status, message, model: 'gpt-4o-mini' });

/** The variables a library prompt was resolved with. */
const promptVars = (key: string) => mockPrompt.mock.calls.find(([k]) => k === key)?.[1];
const chatReq = () => mockChat.mock.calls[0][0];

beforeEach(() => {
  mockPrompt.mockImplementation(async (key: string) => ({ content: `body:${key}`, model: `model:${key}` }));
  mockReference.mockResolvedValue('CITIES: Bengaluru');
  mockClubRefs.mockResolvedValue(undefined);
  mockPexels.mockResolvedValue({ photos: [] });
});

describe('aiFillDummyData', () => {
  it('rejects a non-admin and an anonymous caller before any model call', async () => {
    await expect(M.aiFillDummyData({}, { entity: 'POD' }, plainUser())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(M.aiFillDummyData({}, { entity: 'POD' }, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('builds the prompts, calls the model and swaps media lines for imported stock photos', async () => {
    ok(JSON.stringify({ pod_title: 'Sunset Jam', media_text: 'https://a\nhttps://b\nhttps://c' }));
    mockPexels.mockResolvedValue({
      photos: [{ src_large: 'https://pexels/0.jpg' }, { src_medium: 'https://pexels/1-medium.jpg' }],
    });
    mockImport.mockImplementation(async ({ remoteUrl }: { remoteUrl: string }) => ({ url: `ik:${remoteUrl}` }));

    const out = await M.aiFillDummyData({}, { entity: 'POD', prompt: '  jam night  ' }, makeContext({ roles: ['CITY_ADMIN'] }));

    expect(promptVars('generate.dummy_data')).toEqual(
      expect.objectContaining({ user_prompt: 'jam night', fields: expect.stringContaining('"pod_title"') })
    );
    expect(promptVars('generate.dummy_data.user')).toEqual({
      entity: 'pod',
      topic: ' for: jam night',
      reference: '\n\nCITIES: Bengaluru',
    });
    expect(chatReq()).toEqual(
      expect.objectContaining({
        task: 'ai.dummy_data',
        detail: 'POD',
        model: 'model:generate.dummy_data',
        json: true,
        messages: [
          { role: 'system', content: 'body:generate.dummy_data' },
          { role: 'user', content: 'body:generate.dummy_data.user' },
        ],
      })
    );
    // Three lines in → three photos looked up with the title as the query.
    expect(mockPexels).toHaveBeenCalledTimes(3);
    expect(mockPexels).toHaveBeenCalledWith({ query: 'Sunset Jam', page: 1, perPage: 12 });
    expect(mockImport).toHaveBeenCalledWith({ remoteUrl: 'https://pexels/0.jpg', folder: '/pods', surface: 'PORTALS' });
    // There is no third photo on the page, so the third line falls back to the first one.
    expect(JSON.parse(out).media_text).toBe(
      ['ik:https://pexels/0.jpg', 'ik:https://pexels/1-medium.jpg', 'ik:https://pexels/0.jpg'].join('\n')
    );
    expect(mockClubRefs).not.toHaveBeenCalled();
  });

  it('keeps the model media when no stock photo can be found or imported', async () => {
    const raw = JSON.stringify({ pod_title: '', media_text: 'https://model/1' });
    ok(raw);
    mockPexels.mockResolvedValueOnce({ photos: [] }).mockRejectedValueOnce(new Error('pexels down'));

    const out = await M.aiFillDummyData({}, { entity: 'POD', prompt: null }, admin());

    // An empty title and no prompt fall back to the entity name as the query;
    // one line asks for the minimum of two photos.
    expect(mockPexels).toHaveBeenCalledTimes(2);
    expect(mockPexels).toHaveBeenCalledWith({ query: 'pod', page: 1, perPage: 12 });
    expect(JSON.parse(out).media_text).toBe('https://model/1');
    expect(promptVars('generate.dummy_data')).toEqual(expect.objectContaining({ user_prompt: '' }));
    expect(promptVars('generate.dummy_data.user')).toEqual(expect.objectContaining({ topic: '' }));
  });

  it('asks for three photos when the field is missing and drops an import that returns no url', async () => {
    ok(JSON.stringify({ club_name: 'Run Club' }));
    mockPexels.mockResolvedValue({ photos: [{ src_large: 'https://pexels/x.jpg' }] });
    mockImport.mockResolvedValueOnce({ url: '' }).mockResolvedValue({ url: 'ik:x' });

    const out = JSON.parse(await M.aiFillDummyData({}, { entity: 'CLUB', prompt: 'runners' }, admin()));

    // CLUB has two multiline fields, three lookups each.
    expect(mockPexels).toHaveBeenCalledTimes(6);
    expect(out.feature_text).toBe('ik:x\nik:x');
    expect(out.moments_text).toBe('ik:x\nik:x\nik:x');
    expect(mockClubRefs).toHaveBeenCalledWith(expect.objectContaining({ club_name: 'Run Club' }));
  });

  it('still returns the club copy when reference resolution fails, and logs it', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    ok(JSON.stringify({ club_name: 'Chess Circle' }));
    mockClubRefs.mockRejectedValue(new Error('lookup failed'));

    const out = JSON.parse(await M.aiFillDummyData({}, { entity: 'CLUB' }, admin()));

    expect(out.club_name).toBe('Chess Circle');
    expect(warn).toHaveBeenCalledWith('ai.resolver', 'resolveClubReferences', expect.objectContaining({ error: expect.any(Error) }));
    warn.mockRestore();
  });

  it('fills without the reference block when the reference lookup fails', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    mockReference.mockRejectedValue(new Error('db down'));
    ok(JSON.stringify({ product_name: 'Cold Brew' }));

    const out = await M.aiFillDummyData({}, { entity: 'INVENTORY_PRODUCT', prompt: 'coffee' }, admin());

    expect(promptVars('generate.dummy_data.user')).toEqual({ entity: 'inventory_product', topic: ' for: coffee', reference: '' });
    expect(warn).toHaveBeenCalledWith('ai.resolver', 'buildFillReference', expect.any(Object));
    // Inventory products have no image fields.
    expect(mockPexels).not.toHaveBeenCalled();
    expect(JSON.parse(out)).toEqual({ product_name: 'Cold Brew' });
    warn.mockRestore();
  });

  it('cuts the user prompt passed to the system prompt at 500 characters', async () => {
    ok('{}');
    await M.aiFillDummyData({}, { entity: 'INVENTORY_PRODUCT', prompt: 'p'.repeat(700) }, admin());
    expect(promptVars('generate.dummy_data').user_prompt).toHaveLength(500);
  });

  it('maps a model failure to its AI error code', async () => {
    fail('NOT_CONFIGURED');
    await expect(M.aiFillDummyData({}, { entity: 'POD' }, admin())).rejects.toMatchObject({
      message: 'OPENAI_API_KEY is not configured on the server',
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  });

  it('rejects an answer that is not JSON', async () => {
    ok('not json');
    await expect(M.aiFillDummyData({}, { entity: 'POD' }, admin())).rejects.toMatchObject({
      extensions: { code: 'AI_INVALID_JSON' },
    });
  });
});

describe('aiDescribeInventoryProduct', () => {
  it('sends only the context lines that were given', async () => {
    ok('{"short_description":"s","description":"d"}');
    const out = await M.aiDescribeInventoryProduct({}, {
      input: { product_name: 'Cold Brew', brand_name: 'Bean Co', tags: ['coffee', 'cold'], tone: 'playful', product_type: null },
    });
    expect(out).toBe('{"short_description":"s","description":"d"}');
    expect(promptVars('generate.product_copy.user')).toEqual({
      context: 'Product name: Cold Brew\nBrand: Bean Co\nTags: coffee, cold\nTone: playful',
    });
    expect(chatReq()).toEqual(
      expect.objectContaining({ task: 'ai.product_copy', detail: 'Cold Brew', model: 'model:generate.product_copy', json: true })
    );
  });

  it('includes the type and existing short description when present', async () => {
    ok('{}');
    await M.aiDescribeInventoryProduct({}, {
      input: { product_name: 'Mat', product_type: 'EQUIPMENT', short_description: 'Grippy', tags: [] },
    });
    expect(promptVars('generate.product_copy.user')).toEqual({
      context: 'Product name: Mat\nType: EQUIPMENT\nExisting short description: Grippy',
    });
  });

  it('raises the model failure and rejects a non-JSON answer', async () => {
    fail('NETWORK', 'ECONNRESET');
    await expect(M.aiDescribeInventoryProduct({}, { input: { product_name: 'Mat' } })).rejects.toMatchObject({
      message: 'Failed to reach OpenAI: ECONNRESET',
      extensions: { code: 'AI_NETWORK_ERROR' },
    });
    ok('nope');
    await expect(M.aiDescribeInventoryProduct({}, { input: { product_name: 'Mat' } })).rejects.toMatchObject({
      extensions: { code: 'AI_INVALID_JSON' },
    });
  });
});

describe('aiFillLocationAreas', () => {
  const input = { country: ' India ', state: ' Karnataka ', city: ' Bengaluru ' };

  it('rejects anonymous and plain-user callers, and lets an ecomm manager through', async () => {
    await expect(M.aiFillLocationAreas({}, { input }, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    await expect(M.aiFillLocationAreas({}, { input }, plainUser())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    expect(mockChat).not.toHaveBeenCalled();
    ok(JSON.stringify({ zones: [{ zone_name: 'Indiranagar', pincode: '560038' }] }));
    const out = await M.aiFillLocationAreas({}, { input }, makeContext({ roles: ['ECOMM_MANAGER'] }));
    expect(JSON.parse(out)).toEqual({ zones: [{ zone_name: 'Indiranagar', pincode: '560038' }] });
  });

  it.each([
    { country: '', state: 'Karnataka', city: 'Bengaluru' },
    { country: 'India', state: '  ', city: 'Bengaluru' },
    { country: 'India', state: 'Karnataka', city: '' },
  ])('requires country, state and city (%o)', async (bad) => {
    await expect(M.aiFillLocationAreas({}, { input: bad }, admin())).rejects.toMatchObject({
      message: 'Country, state and city are required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('normalizes zone aliases, drops incomplete rows and de-duplicates by name + PIN', async () => {
    ok(
      JSON.stringify({
        zones: [
          { zone_name: ' Indiranagar ', pincode: '560038' },
          { area_name: 'indiranagar', pin_code: '560038' },
          { name: 'Koramangala', postal_code: 560034 },
          { zone_name: 'No Pin' },
          { pincode: '560001' },
          null,
        ],
      })
    );
    const out = await M.aiFillLocationAreas({}, { input }, admin());
    expect(JSON.parse(out)).toEqual({
      zones: [
        { zone_name: 'Indiranagar', pincode: '560038' },
        { zone_name: 'Koramangala', pincode: '560034' },
      ],
    });
    expect(promptVars('generate.city_zones.user')).toEqual({ country: 'India', state: 'Karnataka', city: 'Bengaluru' });
    expect(chatReq()).toEqual(expect.objectContaining({ task: 'ai.location_areas', detail: 'Bengaluru, Karnataka' }));
  });

  it('reads an "areas" list when there is no "zones" list, capped at 80', async () => {
    const areas = Array.from({ length: 90 }, (_, i) => ({ zone_name: `Area ${i}`, pincode: `5600${i}` }));
    ok(JSON.stringify({ areas }));
    const out = JSON.parse(await M.aiFillLocationAreas({}, { input }, admin()));
    expect(out.zones).toHaveLength(80);
    expect(out.zones[0]).toEqual({ zone_name: 'Area 0', pincode: '56000' });
  });

  it('rejects an answer with no usable localities, a non-JSON answer and a model failure', async () => {
    ok(JSON.stringify({ zones: 'none' }));
    await expect(M.aiFillLocationAreas({}, { input }, admin())).rejects.toMatchObject({
      message: 'OpenAI did not return any localities with PIN codes',
    });
    ok('<html>');
    await expect(M.aiFillLocationAreas({}, { input }, admin())).rejects.toMatchObject({
      message: 'OpenAI did not return valid JSON',
      extensions: { code: 'AI_INVALID_JSON' },
    });
    fail('UPSTREAM', 'rate limited', 429);
    await expect(M.aiFillLocationAreas({}, { input }, admin())).rejects.toMatchObject({
      message: 'OpenAI error (429): rate limited',
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
  });
});

describe('adminAiChat', () => {
  it('rejects non-admins and anonymous callers', async () => {
    await expect(M.adminAiChat({}, { prompt: 'hi' }, plainUser())).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(M.adminAiChat({}, { prompt: 'hi' }, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('requires a non-blank prompt', async () => {
    await expect(M.adminAiChat({}, { prompt: '   ' }, admin())).rejects.toMatchObject({
      message: 'Prompt is required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('looks up users named by email, phone or word and hands them to the model with the platform stats', async () => {
    const totals = jest.spyOn(analyticsService, 'dashboardTotals').mockResolvedValue({ users: 3 } as never);
    const inserted = await UserModel.collection.insertOne({
      auth: {
        email: 'asha@example.com',
        phone: { extension: '+91', number: '0000000001' },
        is_email_verified: true,
      },
      profile: { first_name: 'Asha', last_name: 'Rao' },
      metadata: { role_keys: ['USER'], status: 'ACTIVE' },
    });
    await UserModel.collection.insertOne({ profile: { first_name: 'Zed' }, auth: { email: 'zed@example.com' } });
    ok('Asha is active.');

    const answer = await M.adminAiChat({}, { prompt: '  Is ASHA@example.com active?  ' }, makeContext({ roles: ['SUPPORT_USER'] }));

    expect(answer).toBe('Asha is active.');
    expect(totals).toHaveBeenCalledWith(null);
    const vars = promptVars('admin.assistant.user');
    expect(vars.question).toBe('Is ASHA@example.com active?');
    expect(JSON.parse(vars.context_json)).toEqual({
      platform_stats: { users: 3 },
      users: [
        {
          name: 'Asha Rao',
          email: 'asha@example.com',
          phone: '+910000000001',
          roles: ['USER'],
          status: 'ACTIVE',
          is_email_verified: true,
          profile_url: `/users/${String(inserted.insertedId)}`,
        },
      ],
    });
    expect(chatReq()).toEqual(expect.objectContaining({ task: 'ai.admin_chat', model: 'model:admin.assistant', temperature: 0.2 }));
    totals.mockRestore();
  });

  it('matches a phone number on its last ten digits and fills blanks for a sparse user', async () => {
    jest.spyOn(analyticsService, 'dashboardTotals').mockRejectedValue(new Error('analytics down'));
    const inserted = await UserModel.collection.insertOne({ auth: { phone: { number: '9000000002' } } });
    ok('Found one.');

    await M.adminAiChat({}, { prompt: 'who has +91 90000-00002' }, admin());

    const context = JSON.parse(promptVars('admin.assistant.user').context_json);
    expect(context.platform_stats).toBeNull();
    expect(context.users).toEqual([
      {
        name: '',
        email: '',
        phone: '9000000002',
        roles: [],
        status: '',
        is_email_verified: false,
        profile_url: `/users/${String(inserted.insertedId)}`,
      },
    ]);
  });

  it('skips the user lookup when the prompt names nobody', async () => {
    jest.spyOn(analyticsService, 'dashboardTotals').mockResolvedValue(null as never);
    const find = jest.spyOn(UserModel, 'find');
    ok('Hello.');
    await M.adminAiChat({}, { prompt: 'hi' }, admin());
    expect(find).not.toHaveBeenCalled();
    expect(JSON.parse(promptVars('admin.assistant.user').context_json).users).toEqual([]);
    find.mockRestore();
  });

  it('answers "No answer returned." for an empty model answer and raises any other failure', async () => {
    jest.spyOn(analyticsService, 'dashboardTotals').mockResolvedValue(null as never);
    fail('EMPTY');
    await expect(M.adminAiChat({}, { prompt: 'hi' }, admin())).resolves.toBe('No answer returned.');
    fail('UPSTREAM', 'bad gateway', 502);
    await expect(M.adminAiChat({}, { prompt: 'hi' }, admin())).rejects.toMatchObject({
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
  });
});

describe('aiCreateOrUpdateMjml', () => {
  it('allows communications and CRM managers but not other users', async () => {
    ok(JSON.stringify({ mjml: '<mjml><mj-body></mj-body></mjml>' }));
    await expect(
      M.aiCreateOrUpdateMjml({}, { input: { prompt: 'welcome mail' } }, makeContext({ roles: ['COMMUNICATIONS_MANAGER'] }))
    ).resolves.toBe('<mjml><mj-body></mj-body></mjml>');
    await expect(
      M.aiCreateOrUpdateMjml({}, { input: { prompt: 'welcome mail' } }, makeContext({ roles: ['CRM_MANAGER'] }))
    ).resolves.toContain('<mjml>');
    await expect(M.aiCreateOrUpdateMjml({}, { input: { prompt: 'x' } }, plainUser())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('requires a prompt', async () => {
    await expect(M.aiCreateOrUpdateMjml({}, { input: { prompt: '  ' } }, admin())).rejects.toMatchObject({
      message: 'Prompt is required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('passes the current MJML capped at 12,000 characters and the trimmed instruction', async () => {
    ok(JSON.stringify({ mjml: '  <mjml>\n</mjml>  ' }));
    const out = await M.aiCreateOrUpdateMjml({}, { input: { prompt: ' make it blue ', current_mjml: 'm'.repeat(15_000) } }, admin());
    expect(out).toBe('<mjml>\n</mjml>');
    const vars = promptVars('generate.email_mjml.user');
    expect(vars.instruction).toBe('make it blue');
    expect(vars.current_mjml).toHaveLength(12_000);
    expect(chatReq()).toEqual(expect.objectContaining({ task: 'ai.email_mjml', detail: 'make it blue' }));
  });

  it('rejects an answer that is not MJML, and a model failure', async () => {
    ok(JSON.stringify({ mjml: '<html></html>' }));
    await expect(M.aiCreateOrUpdateMjml({}, { input: { prompt: 'x' } }, admin())).rejects.toMatchObject({
      message: 'OpenAI did not return valid MJML',
    });
    ok('');
    await expect(M.aiCreateOrUpdateMjml({}, { input: { prompt: 'x', current_mjml: null } }, admin())).rejects.toMatchObject({
      message: 'OpenAI did not return valid MJML',
    });
    fail('NOT_CONFIGURED');
    await expect(M.aiCreateOrUpdateMjml({}, { input: { prompt: 'x' } }, admin())).rejects.toMatchObject({
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  });
});

describe('aiImproveRichText', () => {
  const editor = () => makeContext({ roles: ['LEGAL_MANAGER'] });

  it('is limited to the rich-text roles', async () => {
    await expect(M.aiImproveRichText({}, { input: { html: '<p>x</p>' } }, makeContext({ roles: ['CITY_ADMIN'] }))).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    expect(mockChat).not.toHaveBeenCalled();
  });

  it.each(['   ', 'h'.repeat(20_001)])('rejects input outside 1..20,000 characters', async (html) => {
    await expect(M.aiImproveRichText({}, { input: { html } }, editor())).rejects.toMatchObject({
      message: 'Rich text must contain between 1 and 20,000 characters',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('returns the improved HTML and passes the context clause', async () => {
    ok(JSON.stringify({ html: '  <p>Better</p>  ' }));
    const out = await M.aiImproveRichText({}, { input: { html: ' <p>ok</p> ', context: ' Refund policy ' } }, editor());
    expect(out).toBe('<p>Better</p>');
    expect(promptVars('generate.rich_text.user')).toEqual({ context: 'Context: Refund policy\n\n', html: '<p>ok</p>' });
    expect(chatReq()).toEqual(expect.objectContaining({ task: 'ai.rich_text', detail: 'Refund policy' }));
  });

  it('omits the context clause when there is none', async () => {
    ok(JSON.stringify({ html: '<p>Better</p>' }));
    await M.aiImproveRichText({}, { input: { html: '<p>ok</p>', context: null } }, editor());
    expect(promptVars('generate.rich_text.user').context).toBe('');
    expect(chatReq().detail).toBe('rich text');
  });

  it.each([
    ['a script tag', '<p>x</p><script>alert(1)</script>'],
    ['an event handler', '<p onclick="steal()">x</p>'],
    ['a javascript: link', '<a href="javascript:steal()">x</a>'],
    ['a data: link', "<a href='data:text/html,x'>x</a>"],
    ['an empty answer', ''],
    ['an oversized answer', `<p>${'x'.repeat(20_001)}</p>`],
  ])('rejects %s from the model', async (_label, html) => {
    ok(JSON.stringify({ html }));
    await expect(M.aiImproveRichText({}, { input: { html: '<p>ok</p>' } }, editor())).rejects.toMatchObject({
      extensions: { code: 'AI_INVALID_JSON' },
    });
  });

  it('rejects a non-JSON answer, a null answer, a non-string html and a model failure', async () => {
    for (const content of ['not json', 'null', JSON.stringify({ html: 42 })]) {
      ok(content);
      await expect(M.aiImproveRichText({}, { input: { html: '<p>ok</p>' } }, editor())).rejects.toMatchObject({
        extensions: { code: 'AI_INVALID_JSON' },
      });
    }
    fail('EMPTY');
    await expect(M.aiImproveRichText({}, { input: { html: '<p>ok</p>' } }, editor())).rejects.toMatchObject({
      extensions: { code: 'AI_EMPTY_RESPONSE' },
    });
  });
});
