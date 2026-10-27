import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import PodRequestListRow from '../PodRequestListRow';
import type { PodRequestRow } from '../queries';
import { renderWithProviders } from '../../../__tests__/render';
import { requestRow } from './fixtures';

afterEach(cleanup);

const mount = (over: Record<string, unknown>) =>
  renderWithProviders(<PodRequestListRow request={requestRow(over) as unknown as PodRequestRow} />);

describe('PodRequestListRow with one side missing', () => {
  it('shows a host with no profile on record as an empty name, for a venue owner', () => {
    mount({ viewer_side: 'VENUE', host: null });
    expect(screen.getByTestId('pod-request-row')).toBeTruthy();
    expect(screen.getByRole('link').textContent).toBe('');
  });

  it('shows a host with no photo or name as an empty avatar, for a venue owner', () => {
    mount({ viewer_side: 'VENUE', host: { __typename: 'PartnerHostSummary', user_id: 'h1', name: null, photo_url: null } });
    expect(screen.getByRole('link').textContent).toBe('');
  });

  it('shows a venue that has gone as an empty name with no place, for a host', () => {
    mount({ viewer_side: 'HOST', venue: null });
    expect(screen.getByRole('link').textContent).toBe('');
    expect(screen.getByText(/^Requested on/)).toBeTruthy();
  });

  it('shows a venue with no name or photo as an empty avatar, for a host', () => {
    mount({
      viewer_side: 'HOST',
      venue: { __typename: 'PartnerVenueSummary', id: 'v1', venue_name: null, locality: null, city: null, cover_image_url: null },
    });
    expect(screen.getByRole('link').textContent).toBe('');
  });
});
