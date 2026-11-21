import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import VenueWebsiteSection from '@/forms/venue-lead/sections/VenueWebsiteSection';
import HostReachSection from '@/forms/host-lead/sections/HostReachSection';
import EcommPresenceSection from '@/forms/ecomm-lead/sections/EcommPresenceSection';
import ProspectPresenceSection from '@/forms/prospect-lead/sections/ProspectPresenceSection';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import { ecommLeadInitialValues } from '@/forms/ecomm-lead/ecomm-lead.types';
import { creatorLeadInitialValues } from '@/forms/prospect-lead';

function Probe() {
  const values = useWatch();
  return <output data-testid="values">{JSON.stringify({ instagram_link: values.instagram_link, social_links: values.social_links })}</output>;
}

function Harness({ defaults, children }: Readonly<{ defaults: Record<string, unknown>; children: ReactElement }>) {
  const methods = useForm({ defaultValues: defaults });
  return (
    <FormProvider {...methods}>
      {children}
      <Probe />
    </FormProvider>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as {
  instagram_link: string;
  social_links: { name: string; url: string }[];
};

const cases: { title: string; section: ReactElement; defaults: Record<string, unknown>; instagramLabel: RegExp }[] = [
  { title: 'venue Website & Social Links', section: <VenueWebsiteSection />, defaults: { ...venueLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'host Social / Reach', section: <HostReachSection />, defaults: { ...hostLeadInitialValues }, instagramLabel: /Instagram \/ Social Link/ },
  { title: 'ecomm Tax & Online Presence', section: <EcommPresenceSection />, defaults: { ...ecommLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'prospect Online Presence', section: <ProspectPresenceSection />, defaults: { ...creatorLeadInitialValues }, instagramLabel: /^Instagram$/ },
];

describe.each(cases)('$title section', ({ section, defaults, instagramLabel }) => {
  it('edits the main Instagram link and adds other social links to the form', () => {
    render(<Harness defaults={defaults}>{section}</Harness>);

    fireEvent.change(screen.getByRole('textbox', { name: instagramLabel }), { target: { value: 'https://instagram.com/duncit' } });
    expect(screen.getByText('No other social links yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add social link' }));
    const row = within(screen.getByTestId('social-link-row-0'));
    fireEvent.change(row.getByRole('textbox', { name: 'Name' }), { target: { value: 'YouTube' } });
    fireEvent.change(row.getByRole('textbox', { name: 'Link' }), { target: { value: 'https://youtube.com/@duncit' } });

    expect(values()).toEqual({
      instagram_link: 'https://instagram.com/duncit',
      social_links: [{ name: 'YouTube', url: 'https://youtube.com/@duncit' }],
    });
  });
});
