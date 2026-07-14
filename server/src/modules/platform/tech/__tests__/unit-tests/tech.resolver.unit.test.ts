import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';

jest.mock('../../tech.service', () => ({
  techService: {
    serverInfo: jest.fn().mockResolvedValue({ kind: 'server' }),
    dockerInfo: jest.fn().mockResolvedValue({ kind: 'docker' }),
    containersTable: jest.fn().mockResolvedValue({ kind: 'table' }),
  },
}));

import { techResolvers } from '../../tech.resolver';
import { techService } from '../../tech.service';

const ctxWith = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles } : null }) as unknown as GraphQLContext;

const tech = ctxWith(['TECH_MANAGER']);

describe('techResolvers.techServerInfo', () => {
  it('returns host metrics for a TECH_MANAGER and forwards the ssl host', async () => {
    const res = await techResolvers.Query.techServerInfo({}, { sslHost: 'server.duncit.com' }, tech);
    expect(res).toEqual({ kind: 'server' });
    expect(techService.serverInfo).toHaveBeenCalledWith('server.duncit.com');
  });

  it('passes undefined when no ssl host is supplied', async () => {
    await techResolvers.Query.techServerInfo({}, { sslHost: null }, ctxWith(['SUPER_ADMIN']));
    expect(techService.serverInfo).toHaveBeenCalledWith(undefined);
  });

  it('denies callers without a tech role', async () => {
    await expect(techResolvers.Query.techServerInfo({}, {}, ctxWith(['USER']))).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.serverInfo).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techDockerInfo', () => {
  it('returns docker info for an authorized caller', async () => {
    const res = await techResolvers.Query.techDockerInfo({}, {}, tech);
    expect(res).toEqual({ kind: 'docker' });
    expect(techService.dockerInfo).toHaveBeenCalledTimes(1);
  });

  it('rejects an unauthenticated caller', async () => {
    await expect(techResolvers.Query.techDockerInfo({}, {}, ctxWith(null))).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.dockerInfo).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techDockerContainersTable', () => {
  it('returns the container table page and forwards the query', async () => {
    const res = await techResolvers.Query.techDockerContainersTable(
      {},
      { query: { search: 'api' } },
      tech
    );
    expect(res).toEqual({ kind: 'table' });
    expect(techService.containersTable).toHaveBeenCalledWith({ search: 'api' });
  });

  it('denies callers without a tech role', async () => {
    await expect(
      techResolvers.Query.techDockerContainersTable({}, {}, ctxWith(['USER']))
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.containersTable).not.toHaveBeenCalled();
  });
});
