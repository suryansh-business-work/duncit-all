import { describe, expect, it } from 'vitest';
import {
  ENV_EXPORT_VERSION,
  buildEnvExport,
  envExportFilename,
  parseEnvImport,
} from '../../src/pages/environment/env-io';
import {
  FLAG_EXPORT_VERSION,
  buildFlagExport,
  flagExportFilename,
  parseFlagImport,
} from '../../src/pages/feature-flags-page/flag-io';
import { makeEnvEntry, makeFeatureFlagRow } from '../mocks';

describe('env-io', () => {
  it('exports real keys and values with no ids', () => {
    const file = buildEnvExport(
      [
        makeEnvEntry({
          description: null,
          assigned_portals: ['tech'],
          config: [{ __typename: 'EnvConfigPair', key: 'host', value: 'smtp.example.com' }] as never,
        }),
      ],
      '2026-08-11T09:00:00.000Z',
    );
    expect(file.duncit_env_export).toBe(ENV_EXPORT_VERSION);
    expect(file.entries).toEqual([
      {
        name: 'SMTP One',
        category: 'EMAIL',
        description: '',
        is_default: false,
        is_active: true,
        assigned_portals: ['tech'],
        config: { host: 'smtp.example.com' },
      },
    ]);
  });

  it('names the file by scope and day', () => {
    expect(envExportFilename('EMAIL', '2026-08-11T09:00:00.000Z')).toBe(
      'duncit-env-EMAIL-2026-08-11.json',
    );
  });

  it('rejects invalid JSON and files without entries', () => {
    expect(parseEnvImport('x')).toEqual({ error: 'That file is not valid JSON.' });
    expect(parseEnvImport('{"entries":3}')).toMatchObject({
      error: expect.stringContaining('no "entries" list'),
    });
    expect(parseEnvImport('null')).toMatchObject({ error: expect.stringContaining('no "entries"') });
  });

  it('rejects the whole file when an entry has no name or category', () => {
    const bad = JSON.stringify({ entries: [{ name: 'a', category: 'X' }, { name: 'b' }] });
    expect(parseEnvImport(bad)).toMatchObject({ error: expect.stringContaining('nothing was imported') });
    expect(parseEnvImport('{"entries":[{"category":"EMAIL"}]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseEnvImport('{"entries":["s"]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
  });

  it('rejects an empty list', () => {
    expect(parseEnvImport('{"entries":[]}')).toEqual({ error: 'That file has no entries in it.' });
  });

  it('turns config back into pairs, stringifying non-strings and dropping nulls', () => {
    const text = JSON.stringify({
      entries: [
        {
          name: 'n',
          category: 'EMAIL',
          description: 5,
          is_default: true,
          is_active: false,
          assigned_portals: ['a', 2],
          config: { host: 'h', port: 587, tls: true, nothing: null, list: [1] },
        },
        { name: 'm', category: 'EMAIL', config: 'bad' },
      ],
    });
    const result = parseEnvImport(text);
    if (!('entries' in result)) throw new Error('expected entries');
    expect(result.entries[0]).toEqual({
      name: 'n',
      category: 'EMAIL',
      description: '',
      is_default: true,
      is_active: false,
      assigned_portals: ['a'],
      config: [
        { key: 'host', value: 'h' },
        { key: 'port', value: '587' },
        { key: 'tls', value: 'true' },
        { key: 'list', value: '[1]' },
      ],
    });
    expect(result.entries[1]).toMatchObject({
      is_default: false,
      is_active: true,
      assigned_portals: [],
      config: [],
    });
  });
});

describe('flag-io', () => {
  it('exports flags by key without ids or system markers', () => {
    const file = buildFlagExport(
      [makeFeatureFlagRow({ key: 'beta', name: 'Beta', description: '', enabled: true })],
      '2026-08-11T09:00:00.000Z',
    );
    expect(file.duncit_flag_export).toBe(FLAG_EXPORT_VERSION);
    expect(file.flags).toEqual([{ key: 'beta', name: 'Beta', description: '', enabled: true }]);
    expect(flagExportFilename('2026-08-11T09:00:00.000Z')).toBe('duncit-feature-flags-2026-08-11.json');
  });

  it('defaults a missing description to an empty string on export', () => {
    const row = { ...makeFeatureFlagRow(), description: null } as never;
    expect(buildFlagExport([row], '2026-08-11T00:00:00.000Z').flags[0].description).toBe('');
  });

  it('rejects invalid JSON, missing list, bad rows and empty lists', () => {
    expect(parseFlagImport('{')).toEqual({ error: 'That file is not valid JSON.' });
    expect(parseFlagImport('{"flags":1}')).toMatchObject({ error: expect.stringContaining('no "flags"') });
    expect(parseFlagImport('{"flags":[{"key":"a"}]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseFlagImport('{"flags":[null]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseFlagImport('{"flags":[]}')).toEqual({ error: 'That file has no flags in it.' });
  });

  it('only enables a flag when the file says exactly true', () => {
    const result = parseFlagImport(
      JSON.stringify({
        flags: [
          { key: 'a', name: 'A', description: 'd', enabled: true },
          { key: 'b', name: 'B', enabled: 'true' },
        ],
      }),
    );
    expect(result).toEqual({
      flags: [
        { key: 'a', name: 'A', description: 'd', enabled: true },
        { key: 'b', name: 'B', description: '', enabled: false },
      ],
    });
  });
});
