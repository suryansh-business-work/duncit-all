import * as docs from '@/graphql/leadEditor';
import { LEAD_KINDS, type LeadKind } from '@/features/leads/leadKinds';
import { gqlRequest } from '@/services/graphql.client';
import { saveLead } from '../saveLead';
import { leadDefaults } from '../values';

jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

const request = gqlRequest as jest.Mock;

/** The kind's create/update mutation and the field it answers under — the portal's own operations. */
const OPS: Record<LeadKind, { create: unknown; update: unknown; field: string }> = {
  VENUE_LEAD: {
    create: docs.CrmAppCreateVenueLeadDocument,
    update: docs.CrmAppUpdateVenueLeadDocument,
    field: 'VenueLead',
  },
  HOST_LEAD: {
    create: docs.CrmAppCreateHostLeadDocument,
    update: docs.CrmAppUpdateHostLeadDocument,
    field: 'HostLead',
  },
  ECOMM_LEAD: {
    create: docs.CrmAppCreateEcommLeadDocument,
    update: docs.CrmAppUpdateEcommLeadDocument,
    field: 'EcommLead',
  },
  CREATOR_LEAD: {
    create: docs.CrmAppCreateCreatorLeadDocument,
    update: docs.CrmAppUpdateCreatorLeadDocument,
    field: 'CreatorLead',
  },
  COMMUNITY_LEAD: {
    create: docs.CrmAppCreateCommunityLeadDocument,
    update: docs.CrmAppUpdateCommunityLeadDocument,
    field: 'CommunityLead',
  },
};

beforeEach(() => jest.clearAllMocks());

describe.each(LEAD_KINDS)('saveLead(%s)', (kind) => {
  const op = OPS[kind];

  it('creates a new lead and returns its id', async () => {
    request.mockResolvedValue({ [`create${op.field}`]: { id: 'new1' } });
    await expect(saveLead(kind, null, leadDefaults(kind))).resolves.toBe('new1');
    expect(request).toHaveBeenCalledWith(op.create, {
      input: expect.objectContaining({ lead_status: 'New' }),
    });
  });

  it('updates the lead it was given, never creating a second one', async () => {
    request.mockResolvedValue({ [`update${op.field}`]: { id: 'l1' } });
    await expect(saveLead(kind, 'l1', leadDefaults(kind))).resolves.toBe('l1');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(op.update, {
      id: 'l1',
      input: expect.objectContaining({ priority: 'Medium' }),
    });
  });
});

it('passes the server’s refusal on, so the screen can show it', async () => {
  request.mockRejectedValue(new Error('A lead with this phone number already exists'));
  await expect(saveLead('VENUE_LEAD', null, leadDefaults('VENUE_LEAD'))).rejects.toThrow(
    'already exists',
  );
});
