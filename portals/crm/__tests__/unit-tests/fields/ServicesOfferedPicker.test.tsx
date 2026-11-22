import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import ServicesOfferedPicker from '@/forms/fields/ServicesOfferedPicker';
import { CRM_SERVICES_OFFERED } from '@/api/data.gql';
import type { CrmServiceOffered } from '@/api/crm.types';
import type { ServiceTargetKind } from '@/config/serviceTargets';

type Values = {
  super_category_id?: string;
  category_ids?: string[];
  sub_category_ids?: string[];
  services_offered?: CrmServiceOffered[];
};

const row = (id: string, title: string, category_id: string | null, sub_category_id: string | null) => ({
  __typename: 'CrmServiceOffered',
  id,
  title,
  slug: title.toLowerCase(),
  super_category_id: 'sup-1',
  category_id,
  sub_category_id,
  super_category_name: 'Venues',
  category_name: null,
  sub_category_name: null,
  applies_to_venue: true,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
  is_active: true,
  sort_order: 0,
});

const CATALOGUE = [
  row('1', 'Valet Parking', 'cat-1', 'sub-1'),
  row('2', 'Catering', 'cat-1', null),
  row('3', 'Bar Service', 'cat-2', 'sub-1'),
  row('4', 'Decor', null, 'sub-2'),
  row('5', 'Audio', null, null),
  row('6', 'Catering', 'cat-1', 'sub-1'),
];

const catalogueMock = (rows: ReturnType<typeof row>[], extraFilter: Record<string, boolean> = {}) => ({
  request: {
    query: CRM_SERVICES_OFFERED,
    variables: { filter: { super_category_id: 'sup-1', is_active: true, ...extraFilter } },
  },
  result: { data: { crmServicesOffered: rows } },
});

function ValueProbe() {
  const value = useWatch<Values>({ name: 'services_offered' });
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({ initial, appliesTo }: Readonly<{ initial: Values; appliesTo?: ServiceTargetKind }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  return (
    <FormProvider {...methods}>
      <form>
        <ServicesOfferedPicker appliesTo={appliesTo} />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

const renderPicker = (
  initial: Values,
  mocks: ReturnType<typeof catalogueMock>[] = [],
  appliesTo?: ServiceTargetKind
) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <Harness initial={initial} appliesTo={appliesTo} />
    </MockedProvider>
  );

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as CrmServiceOffered[] | null;
const combobox = () => screen.getByRole('combobox', { name: /services offered/i });
const optionTitles = () => {
  fireEvent.mouseDown(combobox());
  return within(screen.getByRole('listbox'))
    .getAllByRole('option')
    .map((o) => o.textContent);
};

describe('ServicesOfferedPicker', () => {
  it('shows a disabled field explaining the super category comes first', () => {
    renderPicker({});
    const field = screen.getByRole('textbox', { name: /services offered/i });
    expect(field).toBeDisabled();
    expect(screen.getByText('Pick a super category first; the services list loads from it.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByTestId('value')).toHaveTextContent('null');
  });

  it('offers every active title, de-duplicated and sorted, when no category is picked', async () => {
    renderPicker({ super_category_id: 'sup-1' }, [catalogueMock(CATALOGUE)]);
    expect(await screen.findByText('Auto-loaded from the Services Offered catalogue')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Loaded from your category selection')).toBeInTheDocument();
    expect(optionTitles()).toEqual(['Audio', 'Bar Service', 'Catering', 'Decor', 'Valet Parking']);
  });

  it('narrows to the picked categories and sub-categories, keeping unscoped rows', async () => {
    renderPicker(
      { super_category_id: 'sup-1', category_ids: ['cat-1'], sub_category_ids: ['sub-1'], services_offered: [] },
      [catalogueMock(CATALOGUE, { applies_to_venue: true })],
      'VENUE'
    );
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    // Bar Service is in another category; Decor is in another sub-category.
    expect(optionTitles()).toEqual(['Audio', 'Catering', 'Valet Parking']);
  });

  it('asks the user to add catalogue rows when nothing matches', async () => {
    renderPicker({ super_category_id: 'sup-1' }, [catalogueMock([], { applies_to_host: true })], 'HOST');
    expect(
      await screen.findByText(/No catalogue services for this category/)
    ).toBeInTheDocument();
  });

  it('queries the ecomm-scoped catalogue for ecomm leads', async () => {
    renderPicker({ super_category_id: 'sup-1' }, [catalogueMock([row('9', 'Packaging', null, null)], { applies_to_ecomm: true })], 'ECOMM');
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    expect(optionTitles()).toEqual(['Packaging']);
  });

  it('queries the creator-scoped catalogue for creator leads', async () => {
    renderPicker({ super_category_id: 'sup-1' }, [catalogueMock([row('10', 'Reels', null, null)], { applies_to_creator: true })], 'CREATOR');
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    expect(optionTitles()).toEqual(['Reels']);
  });

  it('queries the community-scoped catalogue for community leads', async () => {
    renderPicker(
      { super_category_id: 'sup-1' },
      [catalogueMock([row('11', 'Group runs', null, null), row('12', 'Meetups', null, null)], { applies_to_community: true })],
      'COMMUNITY'
    );
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    expect(optionTitles()).toEqual(['Group runs', 'Meetups']);
  });

  it('adds a picked title while preserving captured details of existing services', async () => {
    const existing = { service: 'Catering', custom_name: 'Buffet', description: 'Veg only' };
    renderPicker({ super_category_id: 'sup-1', services_offered: [existing] }, [catalogueMock(CATALOGUE)]);
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    expect(screen.getByText('Catering')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('')).toBe(combobox());

    fireEvent.mouseDown(combobox());
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Audio' }));

    expect(value()).toEqual([existing, { service: 'Audio', custom_name: '', description: '' }]);
  });

  it('adds a typed title, trimmed, as a new service', async () => {
    renderPicker({ super_category_id: 'sup-1', services_offered: [] }, [catalogueMock(CATALOGUE)]);
    await screen.findByText('Auto-loaded from the Services Offered catalogue');

    fireEvent.change(combobox(), { target: { value: '  Fireworks  ' } });
    fireEvent.keyDown(combobox(), { key: 'Enter' });

    expect(value()).toEqual([{ service: 'Fireworks', custom_name: '', description: '' }]);
  });

  it('keeps several legacy "Other" services apart: chips show their own names and removing one keeps the rest', async () => {
    const fireworks = { service: 'Other', custom_name: 'Fireworks', description: 'Cold pyro' };
    const drones = { service: 'Other', custom_name: 'Drone show', description: '50 drones' };
    renderPicker({ super_category_id: 'sup-1', services_offered: [fireworks, drones] }, [catalogueMock(CATALOGUE)]);
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    expect(screen.getByText('Fireworks')).toBeInTheDocument();
    expect(screen.getByText('Drone show')).toBeInTheDocument();

    // Adding a title must not turn the second custom service into a copy of the first.
    fireEvent.mouseDown(combobox());
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Audio' }));
    expect(value()).toEqual([fireworks, drones, { service: 'Audio', custom_name: '', description: '' }]);

    // Deleting the first custom chip removes that one, not the other.
    const chip = screen.getByText('Fireworks').closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    expect(value()).toEqual([drones, { service: 'Audio', custom_name: '', description: '' }]);
  });
});
