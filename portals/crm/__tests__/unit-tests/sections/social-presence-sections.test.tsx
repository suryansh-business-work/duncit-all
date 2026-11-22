import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import VenueWebsiteSection from '@/forms/venue-lead/sections/VenueWebsiteSection';
import LeadSocialSection from '@/forms/fields/LeadSocialSection';
import HostReachSection from '@/forms/host-lead/sections/HostReachSection';
import EcommPresenceSection from '@/forms/ecomm-lead/sections/EcommPresenceSection';
import ProspectPresenceSection from '@/forms/prospect-lead/sections/ProspectPresenceSection';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import { ecommLeadInitialValues } from '@/forms/ecomm-lead/ecomm-lead.types';
import { communityLeadInitialValues, creatorLeadInitialValues } from '@/forms/prospect-lead';

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

// Venue, host, creator and community leads share one Social step; ecomm keeps its Presence section.
const cases: { title: string; section: ReactElement; defaults: Record<string, unknown>; instagramLabel: RegExp }[] = [
  { title: 'venue Social', section: <LeadSocialSection />, defaults: { ...venueLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'host Social', section: <LeadSocialSection />, defaults: { ...hostLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'creator Social', section: <LeadSocialSection />, defaults: { ...creatorLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'community Social', section: <LeadSocialSection />, defaults: { ...communityLeadInitialValues }, instagramLabel: /^Instagram$/ },
  { title: 'ecomm Tax & Online Presence', section: <EcommPresenceSection />, defaults: { ...ecommLeadInitialValues }, instagramLabel: /^Instagram$/ },
];

describe('the steps social links moved out of', () => {
  it.each([
    ['venue Website', <VenueWebsiteSection key="v" />, venueLeadInitialValues],
    ['host Reach', <HostReachSection key="h" />, hostLeadInitialValues],
    ['prospect Website', <ProspectPresenceSection key="p" />, creatorLeadInitialValues],
  ] as const)('%s no longer asks for Instagram or other social links', (_title, section, defaults) => {
    render(<Harness defaults={{ ...defaults }}>{section}</Harness>);
    expect(screen.queryByRole('textbox', { name: /Instagram/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add social link' })).toBeNull();
  });
});

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
