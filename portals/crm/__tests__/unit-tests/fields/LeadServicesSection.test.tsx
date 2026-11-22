import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import LeadServicesSection from '@/forms/fields/LeadServicesSection';
import { CRM_SERVICES_OFFERED } from '@/api/data.gql';
import type { CrmServiceOffered } from '@/api/crm.types';
import type { ServiceTargetKind } from '@/config/serviceTargets';

type Values = { super_category_id?: string; services_offered?: CrmServiceOffered[] };

const row = (id: string, title: string) => ({
  __typename: 'CrmServiceOffered',
  id,
  title,
  slug: title.toLowerCase(),
  super_category_id: 'sup-1',
  category_id: null,
  sub_category_id: null,
  super_category_name: 'Events',
  category_name: null,
  sub_category_name: null,
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: true,
  applies_to_creator: true,
  applies_to_community: true,
  is_active: true,
  sort_order: 0,
});

const catalogueMock = (flag: string) => ({
  request: {
    query: CRM_SERVICES_OFFERED,
    variables: { filter: { super_category_id: 'sup-1', is_active: true, [flag]: true } },
  },
  result: { data: { crmServicesOffered: [row('1', 'Catering'), row('2', 'Decor')] } },
});

function ValueProbe() {
  const value = useWatch<Values>({ name: 'services_offered' });
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({ initial, appliesTo }: Readonly<{ initial: Values; appliesTo: ServiceTargetKind }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  return (
    <FormProvider {...methods}>
      <LeadServicesSection appliesTo={appliesTo} />
      <ValueProbe />
    </FormProvider>
  );
}

const renderSection = (initial: Values, appliesTo: ServiceTargetKind = 'VENUE', mocks = [catalogueMock('applies_to_venue')]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <Harness initial={initial} appliesTo={appliesTo} />
    </MockedProvider>
  );

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as CrmServiceOffered[] | null;
const descriptions = () => screen.queryAllByRole('textbox', { name: /What they offer/ });

describe('LeadServicesSection', () => {
  it('asks for a super category first and shows no service cards', () => {
    renderSection({});
    expect(screen.getByText('FROM CATALOGUE · loaded from the Super/Category/Sub you picked')).toBeInTheDocument();
    expect(screen.getByText('Pick a super category first; the services list loads from it.')).toBeInTheDocument();
    expect(descriptions()).toHaveLength(0);
  });

  it('shows a description field under each selected service, prefilled from the lead', async () => {
    renderSection({
      super_category_id: 'sup-1',
      services_offered: [
        { service: 'Catering', custom_name: '', description: 'Veg + Jain menus' },
        { service: 'Other', custom_name: 'Fireworks', description: '' },
        { service: 'Other', custom_name: '', description: '' },
      ],
    });
    await screen.findByText('Auto-loaded from the Services Offered catalogue');

    // A custom "Other" service is headed by its own name; an unnamed one stays "Other".
    expect(screen.getByText('Catering', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Fireworks', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Other', { selector: 'p' })).toBeInTheDocument();
    expect(descriptions().map((field) => (field as HTMLTextAreaElement).value)).toEqual(['Veg + Jain menus', '', '']);
  });

  it('writes what the operator types into that service only', async () => {
    renderSection({
      super_category_id: 'sup-1',
      services_offered: [
        { service: 'Catering', custom_name: '', description: '' },
        { service: 'Decor', custom_name: '', description: 'Flowers' },
      ],
    });
    await screen.findByText('Auto-loaded from the Services Offered catalogue');

    fireEvent.change(descriptions()[0], { target: { value: 'In-house kitchen for 300' } });

    expect(value()).toEqual([
      { service: 'Catering', custom_name: '', description: 'In-house kitchen for 300' },
      { service: 'Decor', custom_name: '', description: 'Flowers' },
    ]);
  });

  it('adds a card when a title is picked, keeping earlier descriptions, and drops it when removed', async () => {
    renderSection({
      super_category_id: 'sup-1',
      services_offered: [{ service: 'Catering', custom_name: '', description: 'Veg only' }],
    });
    await screen.findByText('Auto-loaded from the Services Offered catalogue');
    const picker = screen.getByRole('combobox', { name: /services offered/i });

    fireEvent.mouseDown(picker);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Decor' }));

    expect(descriptions()).toHaveLength(2);
    expect(value()).toEqual([
      { service: 'Catering', custom_name: '', description: 'Veg only' },
      { service: 'Decor', custom_name: '', description: '' },
    ]);

    // The chip's delete icon removes the service and its card.
    const cateringChip = screen.getByRole('button', { name: 'Catering' });
    fireEvent.click(within(cateringChip).getByTestId('CancelIcon'));

    expect(descriptions()).toHaveLength(1);
    expect(value()).toEqual([{ service: 'Decor', custom_name: '', description: '' }]);
  });

  it('loads the catalogue for the lead kind it is given', async () => {
    renderSection({ super_category_id: 'sup-1', services_offered: [] }, 'COMMUNITY', [catalogueMock('applies_to_community')]);
    await screen.findByText('Auto-loaded from the Services Offered catalogue');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /services offered/i }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Catering', 'Decor']);
  });
});
