import { makeContext } from '@test/harness';
import { reelResolvers } from '../../reel.resolver';
import { reelService } from '../../reel.service';

jest.mock('../../reel.service', () => ({
  reelService: {
    list: jest.fn(),
    get: jest.fn(),
    driveStatus: jest.fn(),
    driveFolder: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addDriveAssets: jest.fn(),
    removeAsset: jest.fn(),
    sendMessage: jest.fn(),
    restoreVersion: jest.fn(),
    saveSpec: jest.fn(),
  },
}));

const service = reelService as jest.Mocked<typeof reelService>;
const { Query, Mutation } = reelResolvers;

const manager = makeContext({ id: 'user-1', email: 'reels@duncit.com', roles: ['AI_MANAGER'] });
const ACTOR = { id: 'user-1', email: 'reels@duncit.com' };
const INPUT = { name: 'Jam night recap', drive_url: '' };

/** Every resolver, called with the arguments the schema gives it. */
const CALLS: Array<[string, (ctx: ReturnType<typeof makeContext>) => unknown]> = [
  ['reelProjects', (ctx) => Query.reelProjects(null, {}, ctx)],
  ['reelProject', (ctx) => Query.reelProject(null, { id: 'p1' }, ctx)],
  ['reelDriveStatus', (ctx) => Query.reelDriveStatus(null, {}, ctx)],
  ['reelDriveFolder', (ctx) => Query.reelDriveFolder(null, { folder: 'folder-link' }, ctx)],
  ['createReelProject', (ctx) => Mutation.createReelProject(null, { input: INPUT }, ctx)],
  ['updateReelProject', (ctx) => Mutation.updateReelProject(null, { id: 'p1', input: INPUT }, ctx)],
  ['deleteReelProject', (ctx) => Mutation.deleteReelProject(null, { id: 'p1' }, ctx)],
  ['addReelDriveAssets', (ctx) => Mutation.addReelDriveAssets(null, { project_id: 'p1', file_ids: ['f1'] }, ctx)],
  ['removeReelAsset', (ctx) => Mutation.removeReelAsset(null, { project_id: 'p1', asset_id: 'a1' }, ctx)],
  ['sendReelMessage', (ctx) => Mutation.sendReelMessage(null, { input: { project_id: 'p1', text: 'hi' } }, ctx)],
  ['restoreReelVersion', (ctx) => Mutation.restoreReelVersion(null, { project_id: 'p1', message_id: 'm1' }, ctx)],
  ['saveReelSpec', (ctx) => Mutation.saveReelSpec(null, { project_id: 'p1', spec_json: '{}' }, ctx)],
];

describe('reelResolvers — who may call them', () => {
  it.each(CALLS)('%s refuses a signed-out caller', (_name, call) => {
    expect(() => call(makeContext())).toThrow();
  });

  it.each(CALLS)('%s refuses a role outside the AI portal', (_name, call) => {
    expect(() => call(makeContext({ roles: ['FINANCE_MANAGER'] }))).toThrow('Access Denied');
  });

  it('lets a super admin in', () => {
    Query.reelProjects(null, {}, makeContext({ roles: ['SUPER_ADMIN'] }));
    expect(service.list).toHaveBeenCalledTimes(1);
  });
});

describe('reelResolvers — what they hand the service', () => {
  it('reads', () => {
    Query.reelProjects(null, {}, manager);
    Query.reelProject(null, { id: 'p1' }, manager);
    Query.reelDriveStatus(null, {}, manager);
    Query.reelDriveFolder(null, { folder: 'folder-link' }, manager);
    expect(service.list).toHaveBeenCalledWith();
    expect(service.get).toHaveBeenCalledWith('p1');
    expect(service.driveStatus).toHaveBeenCalledWith();
    expect(service.driveFolder).toHaveBeenCalledWith('folder-link');
  });

  it('writes as the signed-in operator', () => {
    Mutation.createReelProject(null, { input: INPUT }, manager);
    Mutation.updateReelProject(null, { id: 'p1', input: INPUT }, manager);
    Mutation.deleteReelProject(null, { id: 'p1' }, manager);
    Mutation.addReelDriveAssets(null, { project_id: 'p1', file_ids: ['f1'] }, manager);
    Mutation.removeReelAsset(null, { project_id: 'p1', asset_id: 'a1' }, manager);
    Mutation.sendReelMessage(null, { input: { project_id: 'p1', text: 'hi' } }, manager);
    Mutation.restoreReelVersion(null, { project_id: 'p1', message_id: 'm1' }, manager);
    Mutation.saveReelSpec(null, { project_id: 'p1', spec_json: '{}' }, manager);
    expect(service.create).toHaveBeenCalledWith(INPUT, ACTOR);
    expect(service.update).toHaveBeenCalledWith('p1', INPUT, ACTOR);
    expect(service.remove).toHaveBeenCalledWith('p1');
    expect(service.addDriveAssets).toHaveBeenCalledWith('p1', ['f1'], ACTOR);
    expect(service.removeAsset).toHaveBeenCalledWith('p1', 'a1', ACTOR);
    expect(service.sendMessage).toHaveBeenCalledWith({ project_id: 'p1', text: 'hi' }, ACTOR);
    expect(service.restoreVersion).toHaveBeenCalledWith('p1', 'm1', ACTOR);
    expect(service.saveSpec).toHaveBeenCalledWith('p1', '{}', ACTOR);
  });

  it('names an operator whose account has no email by id alone', () => {
    Mutation.createReelProject(null, { input: INPUT }, makeContext({ id: 'user-2', roles: ['AI_MANAGER'] }));
    expect(service.create).toHaveBeenCalledWith(INPUT, { id: 'user-2', email: '' });
  });
});
