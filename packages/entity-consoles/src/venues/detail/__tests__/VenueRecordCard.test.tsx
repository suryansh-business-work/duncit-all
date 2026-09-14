import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import VenueRecordCard from '../VenueRecordCard';
import { makeVenue } from './fixtures';

/** The InfoRow whose caption is `label` — stacked rows caption as a span. */
const row = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;

/** A split row, whose label is a body2 paragraph. */
const splitRow = (label: string) => screen.getByText(label, { selector: 'p' }).parentElement as HTMLElement;

describe('VenueRecordCard', () => {
  it('reads the venue id, each review stamp, the commercials and the reviewer notes', () => {
    render(<VenueRecordCard venue={makeVenue()} />);

    expect(screen.getByRole('heading', { name: 'Record' })).toBeInTheDocument();
    expect(row('Venue ID')).toHaveTextContent('DUN-VEN-2210');
    expect(row('Created')).toHaveTextContent(formatDateTime('2026-02-20T08:00:00.000Z'));
    expect(row('Submitted')).toHaveTextContent(formatDateTime('2026-03-01T09:00:00.000Z'));
    expect(row('Approved')).toHaveTextContent(formatDateTime('2026-03-05T11:30:00.000Z'));
    expect(row('Last updated')).toHaveTextContent(formatDateTime('2026-03-06T12:00:00.000Z'));
    expect(splitRow('Venue share')).toHaveTextContent('70%');
    expect(splitRow('Commission')).toHaveTextContent('12%');
    expect(screen.getByText('Checked the lease.')).toBeInTheDocument();
  });

  it('dashes the stamps a venue has not reached and says there are no reviewer notes', () => {
    render(<VenueRecordCard venue={makeVenue({ venue_no: null, submitted_at: undefined, reviewer_notes: '' })} />);

    expect(row('Venue ID')).toHaveTextContent('Venue ID—');
    expect(row('Submitted')).toHaveTextContent('Submitted—');
    expect(row('Rejected')).toHaveTextContent('Rejected—');
    expect(screen.getByText('No reviewer notes.')).toBeInTheDocument();
  });
});
