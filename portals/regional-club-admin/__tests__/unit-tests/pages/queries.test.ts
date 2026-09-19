import { describe, expect, it } from 'vitest';
import { print, type DocumentNode, type OperationDefinitionNode } from 'graphql';
import {
  ADD_REGION_CLUB_ADMIN,
  MY_REGION_MEMBERS,
  MY_REGION_TREE,
  NODE_KIND_KEYS,
  NODE_TONE,
  REGION_CLUB_ADMIN_CANDIDATES,
  REGION_CLUB_ADMIN_CLUBS,
  REGION_CLUB_PODS,
  REGION_HOST_PODS,
  REMOVE_REGION_CLUB_ADMIN,
  RENAME_MY_REGION,
} from '../../../src/pages/queries';

const operationName = (doc: DocumentNode) => (doc.definitions[0] as OperationDefinitionNode).name?.value;

describe('region GraphQL documents', () => {
  it('names every operation the console sends', () => {
    expect(
      [
        MY_REGION_TREE,
        MY_REGION_MEMBERS,
        REGION_CLUB_ADMIN_CANDIDATES,
        REGION_HOST_PODS,
        REGION_CLUB_ADMIN_CLUBS,
        REGION_CLUB_PODS,
        RENAME_MY_REGION,
        ADD_REGION_CLUB_ADMIN,
        REMOVE_REGION_CLUB_ADMIN,
      ].map(operationName),
    ).toEqual([
      'MyRegionTree',
      'MyRegionMembers',
      'RegionClubAdminCandidates',
      'RegionHostPods',
      'RegionClubAdminClubs',
      'RegionClubPods',
      'RenameMyRegion',
      'AddRegionClubAdmin',
      'RemoveRegionClubAdmin',
    ]);
  });

  it('reads the region the same way in every document that returns one', () => {
    for (const doc of [MY_REGION_TREE, MY_REGION_MEMBERS, RENAME_MY_REGION, ADD_REGION_CLUB_ADMIN]) {
      const text = print(doc);
      expect(text).toContain('region_no');
      expect(text).toContain('club_admin_count');
    }
  });

  it('reads one pod row shape through both pod scopes', () => {
    for (const doc of [REGION_HOST_PODS, REGION_CLUB_PODS]) {
      const text = print(doc);
      expect(text).toContain('pod_date_time');
      expect(text).toContain('club_name');
      expect(text).toContain('total');
    }
  });
});

describe('node kinds', () => {
  it('gives every level a tone and a label key, in hierarchy order', () => {
    expect(Object.keys(NODE_TONE)).toEqual(['REGION', 'CITY', 'LOCALITY', 'CLUB_ADMIN', 'HOST']);
    expect(Object.keys(NODE_KIND_KEYS)).toEqual(Object.keys(NODE_TONE));
    expect(NODE_KIND_KEYS.HOST).toBe('partners.regional.kindHost');
  });
});
