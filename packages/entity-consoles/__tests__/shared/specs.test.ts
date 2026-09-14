import { describe, expect, it } from 'vitest';
import type { OperationDefinitionNode } from 'graphql';
import {
  CLUB_ADMINS_SPEC,
  CLUBS_SPEC,
  DIRECTORY_SPECS,
  HOSTS_SPEC,
  PODS_SPEC,
  VENUES_SPEC,
} from '../../src/shared/specs';
import * as directoryTypes from '../../src/shared/types';
import { AUTO_PODS_PATH } from '../../src/shared/routes';
import type { DirectorySpec } from '../../src/shared/types';

/**
 * The directory specs are data, and the dashboard trusts them blindly: a tile
 * finds its number by its key, so a key that is not an alias in the counts
 * document is a tile stuck on zero.
 */
const aliasesOf = (spec: DirectorySpec) => {
  const operation = spec.countsDocument.definitions[0] as OperationDefinitionNode;
  return operation.selectionSet.selections.map((selection) =>
    selection.kind === 'Field' ? (selection.alias?.value ?? selection.name.value) : '',
  );
};

const queryStrings = (spec: DirectorySpec) => spec.tiles.map((tile) => tile.listQuery);

describe('directory specs', () => {
  it('looks every console up by its entity', () => {
    expect(Object.keys(DIRECTORY_SPECS)).toEqual(['venues', 'clubs', 'clubAdmins', 'hosts', 'pods']);
    for (const [entity, spec] of Object.entries(DIRECTORY_SPECS)) {
      expect(spec.entity).toBe(entity);
    }
  });

  it.each(Object.values(DIRECTORY_SPECS))('counts every $entity tile in ONE aliased document', (spec) => {
    expect(aliasesOf(spec)).toEqual(spec.tiles.map((tile) => tile.key));
  });

  it.each(Object.values(DIRECTORY_SPECS))('names the $entity copy under its own namespace', (spec) => {
    expect(spec.titleKey).toBe(`directory.${spec.entity}.title`);
    expect(spec.subtitleKey).toBe(`directory.${spec.entity}.subtitle`);
    expect(spec.dashboardTitleKey).toBe(`directory.${spec.entity}.dashboardTitle`);
  });

  it('waits on SUBMITTED for an application a venue or host sent', () => {
    const lifecycle = [null, 'status=APPROVED', 'status=SUBMITTED', 'status=REJECTED'];
    expect(queryStrings(VENUES_SPEC)).toEqual(lifecycle);
    expect(queryStrings(HOSTS_SPEC)).toEqual(lifecycle);
  });

  it('waits on DRAFT for a club admin, who never applies', () => {
    expect(queryStrings(CLUB_ADMINS_SPEC)).toEqual([
      null,
      'status=APPROVED',
      'status=DRAFT',
      'status=REJECTED',
    ]);
    expect(CLUB_ADMINS_SPEC.tiles.find((tile) => tile.key === 'pending')?.tone).toBe('warning');
  });

  it('splits clubs by live and verified, and pods by lifecycle', () => {
    expect(queryStrings(CLUBS_SPEC)).toEqual([
      null,
      'is_active=true',
      'is_verified=true',
      'is_active=false',
    ]);
    expect(queryStrings(PODS_SPEC)).toEqual([
      null,
      'lifecycle=UPCOMING',
      'lifecycle=ONGOING',
      'lifecycle=COMPLETED',
    ]);
  });

  it('keeps the spec types free of runtime values, so a spec stays plain data', () => {
    expect(Object.keys(directoryTypes)).toEqual([]);
  });
});

describe('shared routes', () => {
  it('serves auto pods at /auto-pods', () => {
    expect(AUTO_PODS_PATH).toBe('/auto-pods');
  });
});
