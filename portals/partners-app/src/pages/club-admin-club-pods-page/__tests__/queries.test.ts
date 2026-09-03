import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  CLUB_ADMIN_CREATE_POD,
  CLUB_ADMIN_DELETE_POD,
  CLUB_ADMIN_HOST_SEARCH,
  CLUB_ADMIN_POD_LOOKUPS,
  CLUB_ADMIN_PODS_TABLE,
  CLUB_ADMIN_UPDATE_POD,
} from '@duncit/pod-form';
import { CLUB_ADMIN_PODS } from '../queries';

describe('CLUB_ADMIN_POD_LOOKUPS', () => {
  it('is parameterless and fills all three pickers in one round trip', () => {
    expect(operationOf(CLUB_ADMIN_POD_LOOKUPS)).toEqual({
      name: 'ClubAdminPodLookups',
      type: 'query',
    });
    expect(variablesOf(CLUB_ADMIN_POD_LOOKUPS)).toEqual({});
    expect(fieldsAt(CLUB_ADMIN_POD_LOOKUPS)).toEqual([
      'myAdminClubs',
      'myVenues',
      'availablePodProducts',
    ]);
  });

  it('returns the club category ids the pod form seeds its cascade from', () => {
    expect(fieldsAt(CLUB_ADMIN_POD_LOOKUPS, 'myAdminClubs')).toEqual([
      'id',
      'club_name',
      'meetup_venues_id',
      'super_category_id',
      'category_id',
    ]);
  });

  it('returns status and is_active, the two fields the venue list is filtered on', () => {
    const venue = fieldsAt(CLUB_ADMIN_POD_LOOKUPS, 'myVenues');
    expect(venue).toContain('status');
    expect(venue).toContain('is_active');
    expect(venue).toEqual(expect.arrayContaining(['id', 'venue_name', 'city', 'locality']));
  });

  it('returns stock and price per product so the request rows can be priced', () => {
    const product = fieldsAt(CLUB_ADMIN_POD_LOOKUPS, 'availablePodProducts');
    expect(product).toEqual(
      expect.arrayContaining([
        'id',
        'product_name',
        'unit_cost',
        'available_count',
        'listing_review_status',
      ]),
    );
    expect(fieldsAt(CLUB_ADMIN_POD_LOOKUPS, 'availablePodProducts', 'categories')).toEqual([
      'super_category_id',
      'category_id',
      'sub_category_id',
    ]);
  });
});

describe('CLUB_ADMIN_PODS', () => {
  it('filters through an optional PodFilterInput', () => {
    expect(operationOf(CLUB_ADMIN_PODS)).toEqual({ name: 'ClubAdminPods', type: 'query' });
    expect(variablesOf(CLUB_ADMIN_PODS)).toEqual({ filter: 'PodFilterInput' });
    expect(argumentsAt(CLUB_ADMIN_PODS, 'pods')).toEqual({ filter: '$filter' });
  });

  it('expands media and product requests rather than returning ids', () => {
    expect(fieldsAt(CLUB_ADMIN_PODS, 'pods', 'pod_images_and_videos')).toEqual(['url', 'type']);
    expect(fieldsAt(CLUB_ADMIN_PODS, 'pods', 'product_requests')).toEqual(['product_id', 'quantity']);
  });
});

describe('CLUB_ADMIN_PODS_TABLE', () => {
  it('pages through the club-scoped resolver, not the public podsTable', () => {
    expect(operationOf(CLUB_ADMIN_PODS_TABLE)).toEqual({
      name: 'ClubAdminPodsTable',
      type: 'query',
    });
    expect(variablesOf(CLUB_ADMIN_PODS_TABLE)).toEqual({
      club_id: 'ID',
      query: 'TableQueryInput',
    });
    // Scope is an ARGUMENT the server enforces, never a client-side filter.
    expect(fieldsAt(CLUB_ADMIN_PODS_TABLE)).toEqual(['clubAdminPodsTable']);
    expect(argumentsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable')).toEqual({
      club_id: '$club_id',
      query: '$query',
    });
    expect(fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable')).toEqual(['total', 'rows']);
  });

  it('reads the stage fields so every booking-cycle state is renderable', () => {
    const rowFields = fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable', 'rows');
    expect(rowFields).toEqual(
      expect.arrayContaining(['is_active', 'is_deleted', 'venue_approval_status', 'completed_at']),
    );
  });

  it('rows are a superset of the plain list selection, so a row can prefill the editor', () => {
    const listFields = fieldsAt(CLUB_ADMIN_PODS, 'pods');
    const rowFields = fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable', 'rows');
    for (const field of listFields) {
      expect(rowFields).toContain(field);
    }
    expect(rowFields.length).toBeGreaterThan(listFields.length);
  });

  it('adds the edit-only fields the list view has no use for', () => {
    const rowFields = fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable', 'rows');
    const listFields = new Set(fieldsAt(CLUB_ADMIN_PODS, 'pods'));
    const editOnly = rowFields.filter((field) => !listFields.has(field));
    expect([...editOnly].sort((a, b) => a.localeCompare(b))).toEqual([
      'host_names',
      'is_deleted',
      'location_id',
      'place_charges',
      'pod_hosts_id',
      'reel_url',
      'venue_approval_status',
    ]);
  });

  it('resolves the row fragment, expanding nested media and charge groups', () => {
    expect(fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable', 'rows', 'place_charges')).toEqual([
      'label',
      'amount',
      'note',
    ]);
    expect(
      fieldsAt(CLUB_ADMIN_PODS_TABLE, 'clubAdminPodsTable', 'rows', 'pod_images_and_videos'),
    ).toEqual(['url', 'type']);
  });
});

describe('CLUB_ADMIN_HOST_SEARCH', () => {
  it('takes an optional search term so the picker can open unfiltered', () => {
    expect(operationOf(CLUB_ADMIN_HOST_SEARCH)).toEqual({
      name: 'ClubAdminHostSearch',
      type: 'query',
    });
    expect(variablesOf(CLUB_ADMIN_HOST_SEARCH)).toEqual({ search: 'String' });
    expect(argumentsAt(CLUB_ADMIN_HOST_SEARCH, 'clubAdminHostSearch')).toEqual({ search: '$search' });
  });

  it('returns the id plus the two labels the option row shows', () => {
    expect(fieldsAt(CLUB_ADMIN_HOST_SEARCH, 'clubAdminHostSearch')).toEqual([
      'user_id',
      'full_name',
      'email',
    ]);
  });
});

describe('pod write mutations', () => {
  it('creates from a CreatePodInput and returns only the new id', () => {
    expect(operationOf(CLUB_ADMIN_CREATE_POD)).toEqual({
      name: 'ClubAdminCreatePod',
      type: 'mutation',
    });
    expect(variablesOf(CLUB_ADMIN_CREATE_POD)).toEqual({ input: 'CreatePodInput!' });
    expect(fieldsAt(CLUB_ADMIN_CREATE_POD, 'clubAdminCreatePod')).toEqual(['id']);
  });

  it('updates by pod_doc_id with the separate UpdatePodInput shape', () => {
    expect(operationOf(CLUB_ADMIN_UPDATE_POD)).toEqual({
      name: 'ClubAdminUpdatePod',
      type: 'mutation',
    });
    expect(variablesOf(CLUB_ADMIN_UPDATE_POD)).toEqual({
      pod_doc_id: 'ID!',
      input: 'UpdatePodInput!',
    });
    expect(argumentsAt(CLUB_ADMIN_UPDATE_POD, 'clubAdminUpdatePod')).toEqual({
      pod_doc_id: '$pod_doc_id',
      input: '$input',
    });
  });

  it('deletes by pod_doc_id and resolves to a scalar', () => {
    expect(operationOf(CLUB_ADMIN_DELETE_POD)).toEqual({
      name: 'ClubAdminDeletePod',
      type: 'mutation',
    });
    expect(variablesOf(CLUB_ADMIN_DELETE_POD)).toEqual({ pod_doc_id: 'ID!' });
    expect(() => fieldsAt(CLUB_ADMIN_DELETE_POD, 'clubAdminDeletePod')).toThrow(
      /selects no sub-fields/,
    );
  });

  it('gives every operation a distinct name so Apollo cannot collide them', () => {
    const names = [
      CLUB_ADMIN_POD_LOOKUPS,
      CLUB_ADMIN_PODS,
      CLUB_ADMIN_PODS_TABLE,
      CLUB_ADMIN_HOST_SEARCH,
      CLUB_ADMIN_CREATE_POD,
      CLUB_ADMIN_UPDATE_POD,
      CLUB_ADMIN_DELETE_POD,
    ].map((doc) => operationOf(doc).name);
    expect(new Set(names).size).toBe(names.length);
  });
});
