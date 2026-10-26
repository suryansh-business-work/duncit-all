import { appBuildResolvers } from '../../appBuild.resolver';
import { storeListingResolvers } from '../../storeListing.resolver';
import { storeReleaseResolvers } from '../../storeRelease.resolver';
import { appBuildService } from '../../appBuild.service';
import { generateIosSigning, iosSigningBundle, iosSigningFile } from '../../iosSigning.service';
import { updateStoreListing, pubStoreListing } from '../../storeListing.service';
import { pubSettings, updateStoreReleaseSettings } from '../../storeRelease.service';
import { makeContext } from '@test/harness';

jest.mock('../../appBuild.service', () => ({ appBuildService: { report: jest.fn() } }));
jest.mock('../../iosSigning.service', () => ({ generateIosSigning: jest.fn(), iosSigningBundle: jest.fn(), iosSigningFile: jest.fn(), iosSigningForBuild: jest.fn() }));
jest.mock('../../storeListing.service', () => ({ updateStoreListing: jest.fn(), pubStoreListing: jest.fn((doc) => ({ pub: doc })) }));
jest.mock('../../storeRelease.service', () => ({ updateStoreReleaseSettings: jest.fn(), pubSettings: jest.fn((doc) => ({ pub: doc })) }));

type Resolver = Record<string, (...args: any[]) => any>;
const withEmail = makeContext({ id: 'u1', email: 'ops@duncit.com', roles: ['TECH_MANAGER'] });
const withoutEmail = makeContext({ id: 'u2', roles: ['SUPER_ADMIN'] });
const outsider = makeContext({ id: 'u3', roles: ['USER'] });

describe('the actor recorded by the build resolvers is the email, else the id', () => {
  const M = appBuildResolvers.Mutation as Resolver;
  const Q = appBuildResolvers.Query as Resolver;

  it('reportAppBuild', async () => {
    await M.reportAppBuild({}, { input: { v: 1 } }, withEmail);
    expect(appBuildService.report).toHaveBeenLastCalledWith({ v: 1 }, 'ops@duncit.com');
    await M.reportAppBuild({}, { input: { v: 2 } }, withoutEmail);
    expect(appBuildService.report).toHaveBeenLastCalledWith({ v: 2 }, withoutEmail.user?.id);
    expect(() => M.reportAppBuild({}, { input: {} }, outsider)).toThrow('Access Denied');
  });

  it('generateIosSigning', () => {
    M.generateIosSigning({}, {}, withEmail);
    expect(generateIosSigning).toHaveBeenLastCalledWith('ops@duncit.com');
    M.generateIosSigning({}, {}, withoutEmail);
    expect(generateIosSigning).toHaveBeenLastCalledWith(withoutEmail.user?.id);
  });

  it('downloadIosSigningFile', () => {
    M.downloadIosSigningFile({}, { id: 's1', kind: 'P12' }, withEmail);
    expect(iosSigningFile).toHaveBeenLastCalledWith('s1', 'P12', 'ops@duncit.com');
    M.downloadIosSigningFile({}, { id: 's1', kind: 'P12' }, withoutEmail);
    expect(iosSigningFile).toHaveBeenLastCalledWith('s1', 'P12', withoutEmail.user?.id);
  });

  it('iosSigningBundle', () => {
    Q.iosSigningBundle({}, {}, withEmail);
    expect(iosSigningBundle).toHaveBeenLastCalledWith('ops@duncit.com');
    Q.iosSigningBundle({}, {}, withoutEmail);
    expect(iosSigningBundle).toHaveBeenLastCalledWith(withoutEmail.user?.id);
    expect(() => Q.iosSigningBundle({}, {}, outsider)).toThrow('Access Denied');
  });
});

describe('storeListing.updateStoreListing', () => {
  const M = storeListingResolvers.Mutation as Resolver;

  it('saves as the email, else the id, and returns the public shape', async () => {
    (updateStoreListing as jest.Mock).mockResolvedValue({ saved: true });
    await expect(M.updateStoreListing({}, { input: { name: 'N' } }, withEmail)).resolves.toEqual({ pub: { saved: true } });
    expect(updateStoreListing).toHaveBeenLastCalledWith({ name: 'N' }, 'ops@duncit.com');
    await M.updateStoreListing({}, { input: {} }, withoutEmail);
    expect(updateStoreListing).toHaveBeenLastCalledWith({}, withoutEmail.user?.id);
    await expect(M.updateStoreListing({}, { input: {} }, outsider)).rejects.toThrow('Access Denied');
    expect(pubStoreListing).toHaveBeenCalledTimes(2);
  });
});

describe('storeRelease.updateStoreReleaseSettings', () => {
  const M = storeReleaseResolvers.Mutation as Resolver;

  it('saves as the email, else the id, and returns the public shape', async () => {
    (updateStoreReleaseSettings as jest.Mock).mockResolvedValue({ saved: true });
    await expect(M.updateStoreReleaseSettings({}, { input: { reminder_hours: 24 } }, withEmail)).resolves.toEqual({ pub: { saved: true } });
    expect(updateStoreReleaseSettings).toHaveBeenLastCalledWith({ reminder_hours: 24 }, 'ops@duncit.com');
    await M.updateStoreReleaseSettings({}, { input: {} }, withoutEmail);
    expect(updateStoreReleaseSettings).toHaveBeenLastCalledWith({}, withoutEmail.user?.id);
    await expect(M.updateStoreReleaseSettings({}, { input: {} }, outsider)).rejects.toThrow('Access Denied');
    expect(pubSettings).toHaveBeenCalledTimes(2);
  });
});
