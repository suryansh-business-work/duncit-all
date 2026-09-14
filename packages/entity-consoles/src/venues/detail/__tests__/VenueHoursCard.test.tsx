import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate } from '@duncit/app-settings';
import VenueHoursCard from '../VenueHoursCard';
import type { VenueSettings } from '../queries';
import { missing, venueSettings } from './fixtures';

/** The InfoRow whose caption is `label`. */
const row = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;

const autoExtend = venueSettings().auto_extend;

describe('VenueHoursCard', () => {
  it('reads the hours, the closed weekdays in week order, the holidays and an auto-extend stop date', () => {
    render(<VenueHoursCard settings={venueSettings()} />);

    expect(row('Operating hours')).toHaveTextContent('09:00 – 22:00');
    expect(row('Weekly off')).toHaveTextContent('MondayWednesday');
    expect(row('Holidays')).toHaveTextContent(formatDate('2026-10-02T00:00:00.000Z'));
    expect(row('Auto-extend availability')).toHaveTextContent(
      `On — 14 days ahead, until ${formatDate('2026-12-31T00:00:00.000Z')}`,
    );
  });

  it('reads auto-extend without a stop date as an open-ended horizon', () => {
    render(<VenueHoursCard settings={venueSettings({ auto_extend: { ...autoExtend, until: '' } })} />);

    expect(row('Auto-extend availability')).toHaveTextContent('On — 14 days ahead');
    expect(row('Auto-extend availability')).not.toHaveTextContent('until');
  });

  it('reads the empty copy for a venue open every day, with no holidays and auto-extend off', () => {
    render(
      <VenueHoursCard
        settings={venueSettings({ weekly_off_days: [], holidays: [], auto_extend: { ...autoExtend, enabled: false } })}
      />,
    );

    expect(row('Weekly off')).toHaveTextContent('Open every day');
    expect(row('Holidays')).toHaveTextContent('No holidays set.');
    expect(row('Auto-extend availability')).toHaveTextContent('Off');
  });

  it('reads settings the record never saved as closed-never, no holidays, no hours and auto-extend off', () => {
    render(
      <VenueHoursCard
        settings={venueSettings({
          operating_hours: missing<VenueSettings['operating_hours']>(),
          weekly_off_days: missing<number[]>(),
          holidays: missing<string[]>(),
          auto_extend: missing<VenueSettings['auto_extend']>(),
        })}
      />,
    );

    expect(row('Operating hours')).toHaveTextContent(/^Operating hours –$/);
    expect(row('Weekly off')).toHaveTextContent('Open every day');
    expect(row('Holidays')).toHaveTextContent('No holidays set.');
    expect(row('Auto-extend availability')).toHaveTextContent('Off');
  });
});
