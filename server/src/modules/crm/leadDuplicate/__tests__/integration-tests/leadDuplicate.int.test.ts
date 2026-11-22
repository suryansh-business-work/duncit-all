import type { GraphQLContext } from '@context';
import { crmService } from '@modules/crm/crm/crm.service';
import { crmResolvers } from '@modules/crm/crm/crm.resolver';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { findLeadDuplicates } from '../../leadDuplicate.service';

/**
 * The live duplicate check behind every CRM lead form: one call looks through
 * all five lead collections and names each lead a typed value already
 * belongs to — never the lead being edited.
 */

const seed = async () => {
  const venue = await crmService.createVenueLead({
    venue_name: 'Smash Arena',
    city: 'Pune',
    full_address: 'Plot 12',
    website: 'https://smasharena.in/',
    contacts: [{ name: 'Rohit', mobile_number: '+91 98110 00001', email: 'rohit@example.com' }],
  });
  const creator = await prospectLeadService.create('CREATOR_LEAD', {
    creator_name: 'Riya Runs',
    city: 'Mumbai',
    contacts: [{ name: 'Riya', mobile_number: '9822000002', email: 'riya@example.com' }],
  });
  return { venue: venue!, creator: creator! };
};

describe('findLeadDuplicates', () => {
  it('names the lead of any kind each typed value belongs to', async () => {
    const { venue, creator } = await seed();

    const matches = await findLeadDuplicates(
      {
        contacts: [
          { mobile_number: '9811000001', email: 'RIYA@example.com' },
          { mobile_number: '9800000000', email: 'new@example.com' },
        ],
        website: 'smasharena.in',
      },
      { entity_type: 'HOST_LEAD' }
    );

    expect(matches).toEqual(
      expect.arrayContaining([
        {
          field: 'PHONE',
          value: '9811000001',
          entity_type: 'VENUE_LEAD',
          lead_id: venue.id,
          lead_name: 'Smash Arena',
          city: 'Pune',
          lead_status: 'New',
        },
        expect.objectContaining({ field: 'WEBSITE', value: 'smasharena.in', lead_id: venue.id }),
        expect.objectContaining({ field: 'EMAIL', value: 'RIYA@example.com', entity_type: 'CREATOR_LEAD', lead_id: creator.id }),
      ])
    );
    expect(matches).toHaveLength(3);
  });

  it('never reports the lead being edited, but does report its own kind elsewhere', async () => {
    const { venue } = await seed();
    const values = { contacts: [{ mobile_number: '9811000001' }] };

    expect(await findLeadDuplicates(values, { entity_type: 'VENUE_LEAD', id: venue.id })).toEqual([]);
    // Same id, different kind: a different lead.
    expect(await findLeadDuplicates(values, { entity_type: 'HOST_LEAD', id: venue.id })).toHaveLength(1);
  });

  it('finds nothing for values no lead has, or values too short to compare', async () => {
    await seed();
    expect(await findLeadDuplicates({ contacts: [{ mobile_number: '12345', email: 'nobody@example.com' }], website: 'other.in' })).toEqual([]);
    expect(await findLeadDuplicates({})).toEqual([]);
  });
});

describe('crmLeadDuplicates resolver', () => {
  const crm = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
  const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;

  it('answers CRM staff, excluding the lead named by lead_id', async () => {
    const { venue } = await seed();
    const input = { entity_type: 'VENUE_LEAD' as const, contacts: [{ mobile_number: '9811000001' }] };

    expect(await crmResolvers.Query.crmLeadDuplicates(null, { input }, crm)).toHaveLength(1);
    expect(await crmResolvers.Query.crmLeadDuplicates(null, { input: { ...input, lead_id: venue.id } }, crm)).toEqual([]);
  });

  it('checks only the first twenty contacts of one call', async () => {
    await seed();
    const filler = Array.from({ length: 20 }, (_, i) => ({ mobile_number: `97000000${String(i).padStart(2, '0')}` }));
    const input = { entity_type: 'HOST_LEAD' as const, contacts: [...filler, { mobile_number: '9811000001' }] };

    expect(await crmResolvers.Query.crmLeadDuplicates(null, { input }, crm)).toEqual([]);
  });

  it('refuses anyone outside the CRM', async () => {
    await expect(
      Promise.resolve().then(() => crmResolvers.Query.crmLeadDuplicates(null, { input: { entity_type: 'VENUE_LEAD' } }, member))
    ).rejects.toThrow('Access Denied');
  });
});
