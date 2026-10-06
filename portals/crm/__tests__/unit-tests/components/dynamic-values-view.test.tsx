import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import DynamicValuesView from '@/components/DynamicValuesView';
import { CRM_DYNAMIC_FIELDS } from '@/api/crm.gql';

const fields = (overrides: any[] = []) => ({
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
  result: {
    data: {
      crmDynamicFields: [
        {
          id: 'f1',
          name: 'budget_band',
          label: 'Budget Band',
          kind: 'select',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          multi: false,
          placeholder: '',
          default_value: '',
          hint: '',
          applies_to_venue: true,
          applies_to_host: true,
          required: false,
          sort_order: 1,
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: 'f2',
          name: 'has_terrace',
          label: 'Has Terrace',
          kind: 'boolean',
          options: [],
          multi: false,
          placeholder: '',
          default_value: '',
          hint: '',
          applies_to_venue: true,
          applies_to_host: false,
          required: false,
          sort_order: 2,
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: 'f3',
          name: 'launch_date',
          label: 'Launch Date',
          kind: 'date',
          options: [],
          multi: false,
          placeholder: '',
          default_value: '',
          hint: '',
          applies_to_venue: true,
          applies_to_host: false,
          required: false,
          sort_order: 3,
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: 'f4',
          name: 'amenities',
          label: 'Amenities',
          kind: 'select',
          options: [
            { value: 'pool', label: 'Pool' },
            { value: 'gym', label: 'Gym' },
          ],
          multi: true,
          placeholder: '',
          default_value: '',
          hint: '',
          applies_to_venue: true,
          applies_to_host: false,
          required: false,
          sort_order: 4,
          is_active: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        ...overrides,
      ],
    },
  },
});

describe('DynamicValuesView', () => {
  it('renders the "no fields" message when the server returns empty', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          {
            request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
            result: { data: { crmDynamicFields: [] } },
          },
        ]}
      >
        <DynamicValuesView entity="VENUE_LEAD" json="{}" />
      </MockedProvider>
    );
    expect(await screen.findByText(/No custom fields/i)).toBeTruthy();
  });

  it('renders a labelled row per field and formats booleans + dates', async () => {
    const json = JSON.stringify({
      budget_band: 'high',
      has_terrace: true,
      launch_date: '2026-05-15T10:00:00Z',
      amenities: ['pool', 'gym'],
    });
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fields()]}>
        <DynamicValuesView entity="VENUE_LEAD" json={json} />
      </MockedProvider>
    );
    expect(await screen.findByText('Budget Band')).toBeTruthy();
    // Single-select value maps to its option label.
    expect(screen.getByText('High')).toBeTruthy();
    // Multi-select array maps each value to its label, comma-joined.
    expect(screen.getByText('Pool, Gym')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    // toLocaleDateString swaps "15 May 2026" / "May 15, 2026" depending on the
    // runner's locale (Windows defaults differ from the en-US Linux CI), so
    // match any rendering of May + 2026 with the right day number.
    expect(screen.getByText(/(15.*May.*2026|May.*15.*2026)/i)).toBeTruthy();
  });

  it('falls back to em-dashes for missing values and survives bad JSON', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fields()]}>
        <DynamicValuesView entity="VENUE_LEAD" json="not-valid-json" />
      </MockedProvider>
    );
    expect(await screen.findByText('Budget Band')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

const field = (id: string, name: string, label: string, kind: string, options: { value: string; label: string }[] = []) => ({
  id,
  name,
  label,
  kind,
  options,
  multi: false,
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  required: false,
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

const fieldsMock = (list: ReturnType<typeof field>[]) => ({
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'HOST_LEAD', include_inactive: false } },
  result: { data: { crmDynamicFields: list } },
});

const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('DynamicValuesView — value formatting', () => {
  it('prints scalars as text, objects as JSON and a false flag as "No"', async () => {
    const json = JSON.stringify({ seats: 42, verified: true, meta: { floor: 2 }, has_parking: false });
    render(
      <MockedProvider
        mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          fieldsMock([
            field('t1', 'seats', 'Seats', 'number'),
            field('t2', 'verified', 'Verified text', 'text'),
            field('t3', 'meta', 'Meta', 'text'),
            field('t4', 'has_parking', 'Has Parking', 'boolean'),
          ]),
        ]}
      >
        <DynamicValuesView entity="HOST_LEAD" json={json} />
      </MockedProvider>
    );
    await screen.findByText('Seats');
    expect(valueOf('Seats')).toBe('42');
    expect(valueOf('Verified text')).toBe('true');
    expect(valueOf('Meta')).toBe('{"floor":2}');
    expect(valueOf('Has Parking')).toBe('No');
  });

  it('shows an unparseable date as typed instead of hiding it', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fieldsMock([field('d1', 'opened', 'Opened', 'date')])]}>
        <DynamicValuesView entity="HOST_LEAD" json={JSON.stringify({ opened: 'next spring' })} />
      </MockedProvider>
    );
    await screen.findByText('Opened');
    expect(valueOf('Opened')).toBe('next spring');
  });

  it('keeps a select value with no matching option, dashes an empty pick and blanks a missing entry', async () => {
    const options = [{ value: 'pool', label: 'Pool' }];
    render(
      <MockedProvider
        mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          fieldsMock([
            field('s1', 'tier', 'Tier', 'select', options),
            field('s2', 'extras', 'Extras', 'select', options),
            field('s3', 'perks', 'Perks', 'select', options),
          ]),
        ]}
      >
        <DynamicValuesView entity="HOST_LEAD" json={JSON.stringify({ tier: 'retired-tier', extras: [], perks: ['pool', null] })} />
      </MockedProvider>
    );
    await screen.findByText('Tier');
    expect(valueOf('Tier')).toBe('retired-tier');
    expect(valueOf('Extras')).toBe('—');
    expect(valueOf('Perks')).toBe('Pool, ');
  });

  it('treats an empty value map as no values at all', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[fieldsMock([field('t1', 'notes', 'Notes', 'text')])]}>
        <DynamicValuesView entity="HOST_LEAD" json="" />
      </MockedProvider>
    );
    await screen.findByText('Notes');
    expect(valueOf('Notes')).toBe('—');
  });
});
