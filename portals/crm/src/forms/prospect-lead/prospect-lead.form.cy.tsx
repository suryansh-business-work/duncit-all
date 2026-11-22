import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { CrmOptionGroup } from '../../api/crm.types';
import type { CommunityLead, CreatorLead } from '../../api/prospectLeads.types';
import {
  ProspectLeadForm,
  communityLeadInitialValues,
  communityLeadSchema,
  creatorLeadInitialValues,
  creatorLeadSchema,
  fromCommunityLead,
  fromCreatorLead,
  toCommunityLeadInput,
  toCreatorLeadInput,
} from '.';

// The schemas take the surface's translator; echoing keys keeps the messages assertable.
const echo = ((key: string) => key) as Parameters<typeof creatorLeadSchema>[0];
const creatorSchema = creatorLeadSchema(echo);
const communitySchema = communityLeadSchema(echo);

const validCreator = {
  ...creatorLeadInitialValues,
  super_category_id: 'sc-1',
  creator_name: 'Riya Runs',
  contacts: [{ name: 'Riya', role: '', mobile_number: '9811100001', whatsapp_number: '', email: '' }],
};
const validCommunity = {
  ...communityLeadInitialValues,
  super_category_id: 'sc-1',
  community_name: 'Pune Trail Runners',
  contacts: [{ name: 'Kabir', role: '', mobile_number: '9822200002', whatsapp_number: '', email: '' }],
};

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);

describe('creatorLeadSchema', () => {
  it('accepts a creator with a name, a super category and a primary contact', () => {
    expect(creatorSchema.safeParse(validCreator).success).toBe(true);
  });

  it('asks for the name and super category, and rejects a one-letter name', () => {
    expect(issues(creatorSchema.safeParse({ ...validCreator, creator_name: '', super_category_id: '' }))).toEqual(
      expect.arrayContaining(['crm.creatorLeads.nameRequired', 'crm.prospectLeads.superCategoryRequired'])
    );
    expect(issues(creatorSchema.safeParse({ ...validCreator, creator_name: 'R' }))).toContain('crm.creatorLeads.nameTooShort');
  });

  it.each(['12.5', 'many', '-3'])('rejects followers "%s" that is not a whole number', (followers) => {
    expect(creatorSchema.safeParse({ ...validCreator, followers_count: followers }).success).toBe(false);
  });

  it.each([
    ['', true],
    ['0', true],
    ['4.5', true],
    ['100', true],
    ['100.5', false],
    ['-1', false],
    ['high', false],
  ])('engagement rate "%s" is valid: %s', (rate, ok) => {
    expect(creatorSchema.safeParse({ ...validCreator, engagement_rate: rate }).success).toBe(ok);
  });
});

describe('communityLeadSchema', () => {
  it('accepts a community and rejects a non-numeric member count', () => {
    expect(communitySchema.safeParse(validCommunity).success).toBe(true);
    expect(issues(communitySchema.safeParse({ ...validCommunity, member_count: 'lots' }))[0]).toMatch(/whole number/);
  });

  it('asks for the community name', () => {
    expect(issues(communitySchema.safeParse({ ...validCommunity, community_name: '  ' }))).toContain(
      'crm.communityLeads.nameRequired'
    );
  });
});

describe('prospect lead mapping', () => {
  it('turns blank numbers into null, trims text and drops empty list entries', () => {
    const input = toCreatorLeadInput({
      ...validCreator,
      creator_name: '  Riya Runs ',
      followers_count: '',
      engagement_rate: '4.5',
      niches: [' Fitness ', ''],
      next_follow_up_date: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(input).toMatchObject({
      creator_name: 'Riya Runs',
      followers_count: null,
      engagement_rate: 4.5,
      niches: ['Fitness'],
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
      super_category_id: 'sc-1',
    });
  });

  it('round-trips a saved creator lead through the form values', () => {
    const lead = {
      ...toCreatorLeadInput(validCreator),
      id: 'c1',
      followers_count: 48200,
      engagement_rate: 3,
      activity_log: [],
      dynamic_values_json: '{"rate":"barter"}',
      lead_status: 'New',
      priority: 'High',
    } as unknown as CreatorLead;
    const values = fromCreatorLead(lead);
    expect(values).toMatchObject({ followers_count: '48200', engagement_rate: '3', priority: 'High' });
    expect(toCreatorLeadInput(values)).toMatchObject({ followers_count: 48200, dynamic_values_json: '{"rate":"barter"}' });
  });

  it('gives a community lead with no contacts one empty contact row to fill in', () => {
    const lead = { ...toCommunityLeadInput(validCommunity), id: 'm1', contacts: [], member_count: null, activity_log: [] };
    const values = fromCommunityLead(lead as unknown as CommunityLead);
    expect(values.contacts).toHaveLength(1);
    expect(values.member_count).toBe('');
  });
});

const config = {
  lead_sources: [],
  host_lead_statuses: ['New'],
  priorities: ['Medium'],
  frequencies: ['Weekly'],
  creator_platforms: ['Instagram'],
  collaboration_types: ['Barter'],
  community_types: ['Running Club'],
  community_platforms: ['WhatsApp'],
} as unknown as CrmOptionGroup;

describe('ProspectLeadForm', () => {
  const renderForm = (entity: 'CREATOR_LEAD' | 'COMMUNITY_LEAD', onSubmit = vi.fn()) => {
    render(
      <MockedProvider mocks={[]}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ProspectLeadForm
            entity={entity}
            config={config}
            initialValues={entity === 'CREATOR_LEAD' ? creatorLeadInitialValues : communityLeadInitialValues}
            submitLabel="Save"
            onSubmit={onSubmit}
          />
        </LocalizationProvider>
      </MockedProvider>
    );
    return onSubmit;
  };

  it('shows the creator sections and refuses to submit an empty creator', async () => {
    const onSubmit = renderForm('CREATOR_LEAD');
    expect(screen.getByRole('button', { name: /3\. Reach & Collaboration/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('lead-form-errors')).toHaveTextContent('Creator name is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the community sections instead for a community lead', async () => {
    const onSubmit = renderForm('COMMUNITY_LEAD');
    expect(screen.getByRole('button', { name: /3\. Size & Meetups/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reach & Collaboration/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByTestId('lead-form-errors')).toHaveTextContent('Community name is required'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
