import { makeContext } from '@test/harness';
import { reelResolvers } from '../../reel.resolver';
import { reelService } from '../../reel.service';

jest.mock('../../reel.service', () => ({
  reelService: {
    list: jest.fn(),
    get: jest.fn(),
    driveStatus: jest.fn(),
    driveFolder: jest.fn(),
    mediaSearch: jest.fn(),
    validate: jest.fn(),
    analytics: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addDriveAssets: jest.fn(),
    addStockAssets: jest.fn(),
    addUploadAssets: jest.fn(),
    removeAsset: jest.fn(),
    sendMessage: jest.fn(),
    restoreVersion: jest.fn(),
    saveSpec: jest.fn(),
    generateIdeas: jest.fn(),
    generateScript: jest.fn(),
    applyStoryboard: jest.fn(),
    generateVoiceover: jest.fn(),
    generateSubtitles: jest.fn(),
    generateVariants: jest.fn(),
    setCover: jest.fn(),
    recommendNext: jest.fn(),
  },
}));

const service = reelService as jest.Mocked<typeof reelService>;
const { Query, Mutation } = reelResolvers;

const manager = makeContext({ id: 'user-1', email: 'reels@duncit.com', roles: ['AI_MANAGER'] });
const ACTOR = { id: 'user-1', email: 'reels@duncit.com' };
const INPUT = { name: 'Jam night recap', drive_url: '' };
const STOCK = { provider_id: '1', kind: 'IMAGE' as const, url: 'https://images.pexels.com/p.jpeg', name: 'p', licence: 'L', attribution: 'A' };
const UPLOAD = { url: 'https://ik.imagekit.io/duncit/c.mp4', name: 'c.mp4' };
const CONCEPT = { title: 'T', hook: 'H', angle: 'A' };
const SCRIPT = { hooks: ['H'], scenes: [{ text: 'T', shot: 'S', duration_ms: 2000, asset_query: 'q' }], cta: 'C' };

/** Every resolver, called with the arguments the schema gives it. */
const CALLS: Array<[string, (ctx: ReturnType<typeof makeContext>) => unknown]> = [
  ['reelProjects', (ctx) => Query.reelProjects(null, {}, ctx)],
  ['reelProject', (ctx) => Query.reelProject(null, { id: 'p1' }, ctx)],
  ['reelDriveStatus', (ctx) => Query.reelDriveStatus(null, {}, ctx)],
  ['reelDriveFolder', (ctx) => Query.reelDriveFolder(null, { folder: 'folder-link' }, ctx)],
  ['reelMediaSearch', (ctx) => Query.reelMediaSearch(null, { query: 'dogs', kind: 'IMAGE' }, ctx)],
  ['validateReel', (ctx) => Query.validateReel(null, { project_id: 'p1', platforms: ['INSTAGRAM'] }, ctx)],
  ['reelAnalytics', (ctx) => Query.reelAnalytics(null, { project_id: 'p1' }, ctx)],
  ['createReelProject', (ctx) => Mutation.createReelProject(null, { input: INPUT }, ctx)],
  ['updateReelProject', (ctx) => Mutation.updateReelProject(null, { id: 'p1', input: INPUT }, ctx)],
  ['deleteReelProject', (ctx) => Mutation.deleteReelProject(null, { id: 'p1' }, ctx)],
  ['addReelDriveAssets', (ctx) => Mutation.addReelDriveAssets(null, { project_id: 'p1', file_ids: ['f1'] }, ctx)],
  ['addReelStockAssets', (ctx) => Mutation.addReelStockAssets(null, { project_id: 'p1', items: [STOCK] }, ctx)],
  ['addReelUploadAssets', (ctx) => Mutation.addReelUploadAssets(null, { project_id: 'p1', uploads: [UPLOAD] }, ctx)],
  ['removeReelAsset', (ctx) => Mutation.removeReelAsset(null, { project_id: 'p1', asset_id: 'a1' }, ctx)],
  ['sendReelMessage', (ctx) => Mutation.sendReelMessage(null, { input: { project_id: 'p1', text: 'hi' } }, ctx)],
  ['restoreReelVersion', (ctx) => Mutation.restoreReelVersion(null, { project_id: 'p1', message_id: 'm1' }, ctx)],
  ['saveReelSpec', (ctx) => Mutation.saveReelSpec(null, { project_id: 'p1', spec_json: '{}' }, ctx)],
  ['generateReelIdeas', (ctx) => Mutation.generateReelIdeas(null, { project_id: 'p1', brief: 'b', count: 3 }, ctx)],
  ['generateReelScript', (ctx) => Mutation.generateReelScript(null, { project_id: 'p1', concept: CONCEPT, length_s: 20, tone: 'warm' }, ctx)],
  ['applyReelStoryboard', (ctx) => Mutation.applyReelStoryboard(null, { project_id: 'p1', script: SCRIPT, auto_media: true }, ctx)],
  ['generateReelVoiceover', (ctx) => Mutation.generateReelVoiceover(null, { project_id: 'p1', text: 'say', voice: 'anushka', language: 'en-IN' }, ctx)],
  ['generateReelSubtitles', (ctx) => Mutation.generateReelSubtitles(null, { project_id: 'p1', asset_id: 'a1', language: 'en-IN' }, ctx)],
  ['generateReelVariants', (ctx) => Mutation.generateReelVariants(null, { project_id: 'p1', platforms: ['X'] }, ctx)],
  ['setReelCover', (ctx) => Mutation.setReelCover(null, { project_id: 'p1', at_ms: 1500 }, ctx)],
  ['recommendNextReel', (ctx) => Mutation.recommendNextReel(null, { project_id: 'p1' }, ctx)],
];

describe('reelResolvers — who may call them', () => {
  it.each(CALLS)('%s refuses a signed-out caller', (_name, call) => {
    expect(() => call(makeContext())).toThrow();
  });

  it.each(CALLS)('%s refuses a role outside the Marketing and AI consoles', (_name, call) => {
    expect(() => call(makeContext({ roles: ['FINANCE_MANAGER'] }))).toThrow('Access Denied');
  });

  it('lets a super admin in', () => {
    Query.reelProjects(null, {}, makeContext({ roles: ['SUPER_ADMIN'] }));
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  // The studio lives in the Marketing console; the AI console keeps its access.
  it.each(['MARKETING_MANAGER', 'MARKETING_EDITOR', 'AI_MANAGER'])('lets a %s in', (role) => {
    Query.reelProjects(null, {}, makeContext({ roles: [role] }));
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('acts for a marketing manager by their own id and email', () => {
    const marketer = makeContext({ id: 'user-7', email: 'marketing@duncit.com', roles: ['MARKETING_MANAGER'] });
    Mutation.createReelProject(null, { input: INPUT }, marketer);
    expect(service.create).toHaveBeenCalledWith(INPUT, { id: 'user-7', email: 'marketing@duncit.com' });
  });

  it('lets a marketing editor run the production line in their own name', () => {
    const editor = makeContext({ id: 'user-9', email: 'editor@duncit.com', roles: ['MARKETING_EDITOR'] });
    Mutation.generateReelIdeas(null, { project_id: 'p1', brief: 'b' }, editor);
    expect(service.generateIdeas).toHaveBeenCalledWith('p1', 'b', undefined, { id: 'user-9', email: 'editor@duncit.com' });
  });
});

describe('reelResolvers — what they hand the service', () => {
  it('reads', () => {
    Query.reelProjects(null, {}, manager);
    Query.reelProject(null, { id: 'p1' }, manager);
    Query.reelDriveStatus(null, {}, manager);
    Query.reelDriveFolder(null, { folder: 'folder-link' }, manager);
    Query.reelMediaSearch(null, { query: 'dogs', kind: 'VIDEO', orientation: 'SQUARE', page: 2 }, manager);
    Query.validateReel(null, { project_id: 'p1', platforms: ['INSTAGRAM', 'X'] }, manager);
    Query.reelAnalytics(null, { project_id: 'p1' }, manager);
    expect(service.list).toHaveBeenCalledWith();
    expect(service.get).toHaveBeenCalledWith('p1');
    expect(service.driveStatus).toHaveBeenCalledWith();
    expect(service.driveFolder).toHaveBeenCalledWith('folder-link');
    expect(service.mediaSearch).toHaveBeenCalledWith({ query: 'dogs', kind: 'VIDEO', orientation: 'SQUARE', page: 2 });
    expect(service.validate).toHaveBeenCalledWith('p1', ['INSTAGRAM', 'X']);
    expect(service.analytics).toHaveBeenCalledWith('p1');
  });

  it('writes as the signed-in operator', () => {
    Mutation.createReelProject(null, { input: INPUT }, manager);
    Mutation.updateReelProject(null, { id: 'p1', input: INPUT }, manager);
    Mutation.deleteReelProject(null, { id: 'p1' }, manager);
    Mutation.addReelDriveAssets(null, { project_id: 'p1', file_ids: ['f1'] }, manager);
    Mutation.addReelStockAssets(null, { project_id: 'p1', items: [STOCK] }, manager);
    Mutation.addReelUploadAssets(null, { project_id: 'p1', uploads: [UPLOAD] }, manager);
    Mutation.removeReelAsset(null, { project_id: 'p1', asset_id: 'a1' }, manager);
    Mutation.sendReelMessage(null, { input: { project_id: 'p1', text: 'hi' } }, manager);
    Mutation.restoreReelVersion(null, { project_id: 'p1', message_id: 'm1' }, manager);
    Mutation.saveReelSpec(null, { project_id: 'p1', spec_json: '{}' }, manager);
    expect(service.create).toHaveBeenCalledWith(INPUT, ACTOR);
    expect(service.update).toHaveBeenCalledWith('p1', INPUT, ACTOR);
    expect(service.remove).toHaveBeenCalledWith('p1');
    expect(service.addDriveAssets).toHaveBeenCalledWith('p1', ['f1'], ACTOR);
    expect(service.addStockAssets).toHaveBeenCalledWith('p1', [STOCK], ACTOR);
    expect(service.addUploadAssets).toHaveBeenCalledWith('p1', [UPLOAD], ACTOR);
    expect(service.removeAsset).toHaveBeenCalledWith('p1', 'a1', ACTOR);
    expect(service.sendMessage).toHaveBeenCalledWith({ project_id: 'p1', text: 'hi' }, ACTOR);
    expect(service.restoreVersion).toHaveBeenCalledWith('p1', 'm1', ACTOR);
    expect(service.saveSpec).toHaveBeenCalledWith('p1', '{}', ACTOR);
  });

  it('runs the production line as the signed-in operator, passing every argument through', () => {
    Mutation.generateReelIdeas(null, { project_id: 'p1', brief: 'b', count: 3 }, manager);
    Mutation.generateReelScript(null, { project_id: 'p1', concept: CONCEPT, length_s: 20, tone: 'warm' }, manager);
    Mutation.applyReelStoryboard(null, { project_id: 'p1', script: SCRIPT, auto_media: true }, manager);
    Mutation.generateReelVoiceover(null, { project_id: 'p1', text: 'say', voice: 'anushka', language: 'en-IN' }, manager);
    Mutation.generateReelSubtitles(null, { project_id: 'p1', asset_id: 'a1', language: 'hi-IN' }, manager);
    Mutation.generateReelVariants(null, { project_id: 'p1', platforms: ['X', 'INSTAGRAM'] }, manager);
    Mutation.setReelCover(null, { project_id: 'p1', at_ms: 1500 }, manager);
    Mutation.recommendNextReel(null, { project_id: 'p1' }, manager);
    expect(service.generateIdeas).toHaveBeenCalledWith('p1', 'b', 3, ACTOR);
    expect(service.generateScript).toHaveBeenCalledWith('p1', CONCEPT, 20, 'warm', ACTOR);
    expect(service.applyStoryboard).toHaveBeenCalledWith('p1', SCRIPT, true, ACTOR);
    expect(service.generateVoiceover).toHaveBeenCalledWith('p1', 'say', 'anushka', 'en-IN', ACTOR);
    expect(service.generateSubtitles).toHaveBeenCalledWith('p1', 'a1', 'hi-IN', ACTOR);
    expect(service.generateVariants).toHaveBeenCalledWith('p1', ['X', 'INSTAGRAM'], ACTOR);
    expect(service.setCover).toHaveBeenCalledWith('p1', 1500, ACTOR);
    expect(service.recommendNext).toHaveBeenCalledWith('p1', ACTOR);
  });

  it('names an operator whose account has no email by id alone', () => {
    Mutation.createReelProject(null, { input: INPUT }, makeContext({ id: 'user-2', roles: ['AI_MANAGER'] }));
    expect(service.create).toHaveBeenCalledWith(INPUT, { id: 'user-2', email: '' });
  });
});
