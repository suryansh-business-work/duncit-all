import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';

jest.mock('../../tech.service', () => ({
  techService: {
    serverInfo: jest.fn().mockResolvedValue({ kind: 'server' }),
    dockerInfo: jest.fn().mockResolvedValue({ kind: 'docker' }),
    containersTable: jest.fn().mockResolvedValue({ kind: 'table' }),
    containerLogs: jest.fn().mockResolvedValue('log-text'),
    restartContainer: jest.fn().mockResolvedValue({ ok: true, error: null }),
    execCommand: jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 }),
  },
}));

import { techResolvers } from '../../tech.resolver';
import { techService } from '../../tech.service';

const ctxWith = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles } : null }) as unknown as GraphQLContext;

const tech = ctxWith(['TECH_MANAGER']);

describe('techResolvers.techServerInfo', () => {
  it('returns host metrics for a TECH_MANAGER and forwards the ssl host', async () => {
    const res = await techResolvers.Query.techServerInfo(
      {},
      { sslHost: 'server.duncit.com' },
      tech,
    );
    expect(res).toEqual({ kind: 'server' });
    expect(techService.serverInfo).toHaveBeenCalledWith('server.duncit.com');
  });

  it('passes undefined when no ssl host is supplied', async () => {
    await techResolvers.Query.techServerInfo({}, { sslHost: null }, ctxWith(['SUPER_ADMIN']));
    expect(techService.serverInfo).toHaveBeenCalledWith(undefined);
  });

  it('denies callers without a tech role', async () => {
    await expect(
      techResolvers.Query.techServerInfo({}, {}, ctxWith(['USER'])),
    ).rejects.toBeInstanceOf(GraphQLError);
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
    await expect(techResolvers.Query.techDockerInfo({}, {}, ctxWith(null))).rejects.toBeInstanceOf(
      GraphQLError,
    );
    expect(techService.dockerInfo).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techDockerContainersTable', () => {
  it('returns the container table page and forwards the query', async () => {
    const res = await techResolvers.Query.techDockerContainersTable(
      {},
      { query: { search: 'api' } },
      tech,
    );
    expect(res).toEqual({ kind: 'table' });
    expect(techService.containersTable).toHaveBeenCalledWith({ search: 'api' });
  });

  it('denies callers without a tech role', async () => {
    await expect(
      techResolvers.Query.techDockerContainersTable({}, {}, ctxWith(['USER'])),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.containersTable).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techContainerLogs', () => {
  it('forwards the container name and tail for an authorized caller', async () => {
    const res = await techResolvers.Query.techContainerLogs(
      {},
      { name: 'duncit-crm', tail: 50 },
      tech,
    );
    expect(res).toBe('log-text');
    expect(techService.containerLogs).toHaveBeenCalledWith('duncit-crm', 50);
  });

  it('defaults the tail to 200 when omitted', async () => {
    await techResolvers.Query.techContainerLogs({}, { name: 'duncit-crm', tail: null }, tech);
    expect(techService.containerLogs).toHaveBeenCalledWith('duncit-crm', 200);
  });

  it('denies callers without a tech role', async () => {
    await expect(
      techResolvers.Query.techContainerLogs({}, { name: 'x' }, ctxWith(['USER'])),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.containerLogs).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techRestartContainer', () => {
  it('restarts for an authorized caller and forwards the acting user', async () => {
    const res = await techResolvers.Mutation.techRestartContainer({}, { name: 'duncit-crm' }, tech);
    expect(res).toEqual({ ok: true, error: null });
    expect(techService.restartContainer).toHaveBeenCalledWith(
      'duncit-crm',
      expect.objectContaining({ id: 'u1' }),
    );
  });

  it('denies callers without a tech role', async () => {
    await expect(
      techResolvers.Mutation.techRestartContainer({}, { name: 'x' }, ctxWith(['USER'])),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.restartContainer).not.toHaveBeenCalled();
  });
});

describe('techResolvers.techExec', () => {
  it('runs a command for a SUPER_ADMIN and forwards the acting user', async () => {
    const res = await techResolvers.Mutation.techExec(
      {},
      { command: 'ls -la' },
      ctxWith(['SUPER_ADMIN']),
    );
    expect(res).toEqual({ stdout: 'ok', stderr: '', exitCode: 0 });
    expect(techService.execCommand).toHaveBeenCalledWith(
      'ls -la',
      expect.objectContaining({ id: 'u1' }),
    );
  });

  it('denies a TECH_MANAGER — the terminal is SUPER_ADMIN only', async () => {
    await expect(
      techResolvers.Mutation.techExec({}, { command: 'ls' }, ctxWith(['TECH_MANAGER'])),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.execCommand).not.toHaveBeenCalled();
  });

  it('denies an unauthenticated caller', async () => {
    await expect(
      techResolvers.Mutation.techExec({}, { command: 'ls' }, ctxWith(null)),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(techService.execCommand).not.toHaveBeenCalled();
  });
});
