import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
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
          options: ['Low', 'High'],
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
          applies_to_venue: true,
          applies_to_host: false,
          required: false,
          sort_order: 3,
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
      <MockedProvider
        mocks={[
          {
            request: { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
            result: { data: { crmDynamicFields: [] } },
          },
        ]}
        addTypename={false}
      >
        <DynamicValuesView entity="VENUE_LEAD" json="{}" />
      </MockedProvider>
    );
    expect(await screen.findByText(/No custom fields/i)).toBeTruthy();
  });

  it('renders a labelled row per field and formats booleans + dates', async () => {
    const json = JSON.stringify({
      budget_band: 'High',
      has_terrace: true,
      launch_date: '2026-05-15T10:00:00Z',
    });
    render(
      <MockedProvider mocks={[fields()]} addTypename={false}>
        <DynamicValuesView entity="VENUE_LEAD" json={json} />
      </MockedProvider>
    );
    expect(await screen.findByText('Budget Band')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    // toLocaleDateString swaps "15 May 2026" / "May 15, 2026" depending on the
    // runner's locale (Windows defaults differ from the en-US Linux CI), so
    // match any rendering of May + 2026 with the right day number.
    expect(screen.getByText(/(15.*May.*2026|May.*15.*2026)/i)).toBeTruthy();
  });

  it('falls back to em-dashes for missing values and survives bad JSON', async () => {
    render(
      <MockedProvider mocks={[fields()]} addTypename={false}>
        <DynamicValuesView entity="VENUE_LEAD" json="not-valid-json" />
      </MockedProvider>
    );
    expect(await screen.findByText('Budget Band')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
