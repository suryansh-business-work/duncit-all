import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from '@duncit/shell';
import HostStatTiles from '@/pages/host-leads/HostLeadDetailPage/HostStatTiles';
import type { HostLead } from '@/api/crm.types';
import { hostLead } from '../fixtures/leads';

function Harness({ lead }: Readonly<{ lead: HostLead }>) {
  const { t } = useTranslation();
  return <HostStatTiles lead={lead} t={t} followUpLabel="25 Sep 2026" />;
}

/** The four tiles in render order: audience, services, community, follow-up. */
const tiles = () => Array.from(document.querySelectorAll('.MuiCard-root')) as HTMLElement[];

describe('HostStatTiles', () => {
  it('summarises a fully filled lead', () => {
    render(
      <Harness
        lead={hostLead({
          services_offered: [
            { service: 'Catering', custom_name: null, description: null },
            { service: 'Other', custom_name: 'Photo booth', description: null },
            { service: 'Decor', custom_name: null, description: null },
          ],
        })}
      />,
    );

    const [audience, services, community, followUp] = tiles();
    expect(tiles()).toHaveLength(4);
    expect(audience).toHaveTextContent('50-100');
    expect(audience).toHaveTextContent('Weekly');
    expect(services).toHaveTextContent('3');
    // Only the first two services are listed; "Other" shows its custom name.
    expect(services).toHaveTextContent('Catering, Photo booth');
    expect(services).not.toHaveTextContent('Decor');
    expect(community).toHaveTextContent('400');
    expect(community).toHaveTextContent('Past events: 120 attendees');
    expect(followUp).toHaveTextContent('25 Sep 2026');
    expect(followUp).toHaveTextContent('Assigned to Priya');
  });

  it('falls back to placeholders for a lead with nothing captured', () => {
    render(
      <Harness
        lead={hostLead({
          expected_audience_size: '',
          frequency: null,
          services_offered: [],
          community_size: null,
          previous_events_hosted: false,
          assigned_to: null,
        } as Partial<HostLead>)}
      />,
    );

    const [audience, services, community, followUp] = tiles();
    expect(audience).toHaveTextContent('—');
    expect(audience).toHaveTextContent('Frequency not set');
    expect(services).toHaveTextContent('0');
    expect(services).toHaveTextContent('None tagged');
    expect(community).toHaveTextContent('—');
    expect(community).toHaveTextContent('No past events recorded');
    expect(followUp).toHaveTextContent('Unassigned');
  });

  it('labels an unnamed "Other" service and an unknown attendee count', () => {
    render(
      <Harness
        lead={hostLead({
          services_offered: [{ service: 'Other', custom_name: null, description: null }],
          past_attendees: null,
        } as Partial<HostLead>)}
      />,
    );

    const [, services, community] = tiles();
    expect(services).toHaveTextContent('Other');
    expect(community).toHaveTextContent('Past events: — attendees');
  });
});
