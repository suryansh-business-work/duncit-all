import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useTranslation } from '@duncit/shell';
import VenueStatTiles from '@/pages/venue-leads/VenueLeadDetailPage/VenueStatTiles';
import type { VenueLead } from '@/api/crm.types';
import { venueLead } from '../fixtures/leads';

function Harness({ lead }: Readonly<{ lead: VenueLead }>) {
  const { t } = useTranslation();
  return <VenueStatTiles lead={lead} t={t} followUpLabel="25 Sep 2026" />;
}

/** The four tiles in render order: capacity, services, charges, follow-up. */
const tiles = () => Array.from(document.querySelectorAll('.MuiCard-root')) as HTMLElement[];

describe('VenueStatTiles', () => {
  it('summarises a fully filled lead', () => {
    render(
      <Harness
        lead={venueLead({
          services_offered: [
            { service: 'Catering', custom_name: null, description: null },
            { service: 'Other', custom_name: 'Photo booth', description: null },
            { service: 'Decor', custom_name: null, description: null },
          ],
        })}
      />,
    );

    const [capacity, services, charges, followUp] = tiles();
    expect(tiles()).toHaveLength(4);
    expect(capacity).toHaveTextContent('50 – 300');
    expect(capacity).toHaveTextContent('Indoor');
    expect(services).toHaveTextContent('3');
    // Only the first two services are listed; "Other" shows its custom name.
    expect(services).toHaveTextContent('Catering, Photo booth');
    expect(services).not.toHaveTextContent('Decor');
    expect(charges).toHaveTextContent(`₹${(50000).toLocaleString()}`);
    expect(charges).toHaveTextContent(`Deposit ₹${(10000).toLocaleString()}`);
    expect(followUp).toHaveTextContent('25 Sep 2026');
    expect(followUp).toHaveTextContent('Assigned to Priya');
  });

  it('falls back to placeholders for a lead with nothing captured', () => {
    render(
      <Harness
        lead={venueLead({
          capacity_min: null,
          capacity_max: null,
          space_type: null,
          services_offered: [],
          expected_charges: null,
          security_deposit: 0,
          assigned_to: null,
        })}
      />,
    );

    const [capacity, services, charges, followUp] = tiles();
    expect(capacity).toHaveTextContent('—');
    expect(capacity).toHaveTextContent('Indoor / outdoor not set');
    expect(services).toHaveTextContent('0');
    expect(services).toHaveTextContent('None tagged');
    expect(charges).toHaveTextContent('—');
    expect(charges).toHaveTextContent('No deposit set');
    expect(charges).not.toHaveTextContent('Deposit ₹');
    expect(followUp).toHaveTextContent('Unassigned');
  });

  it('labels an unnamed "Other" service as Other', () => {
    render(<Harness lead={venueLead({ services_offered: [{ service: 'Other', custom_name: null, description: null }] })} />);

    const [, services] = tiles();
    expect(services).toHaveTextContent('1');
    expect(services).toHaveTextContent('Other');
  });
});
