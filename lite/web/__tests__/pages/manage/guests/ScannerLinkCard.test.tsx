import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SITE_URL } from '../../../../../shared/env';
import { ScannerLinkCard } from '../../../../pages/manage/guests/ScannerLinkCard';
import { renderWithProviders } from '../../../test-utils';
import { hostedEvent } from '../manage-mocks';

describe('ScannerLinkCard', () => {
  it('explains the scanner and opens it for this event', () => {
    renderWithProviders(<ScannerLinkCard event={hostedEvent({ slug: 'summer-picnic' })} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Check in guests' })).toBeInTheDocument();
    expect(screen.getByText('Open the scanner on your phone and point it at each guest’s ticket QR.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open scanner' })).toHaveAttribute('href', '/e/summer-picnic/scan');
  });

  it('gives the absolute scanner link to send to a co-host’s phone', () => {
    renderWithProviders(<ScannerLinkCard event={hostedEvent({ slug: 'summer-picnic' })} />);

    expect(screen.getByRole('textbox', { name: 'Scanner link (works for this event’s hosts)' })).toHaveValue(`${SITE_URL}/e/summer-picnic/scan`);
    expect(screen.getByTestId('scanner-link-copy')).toBeInTheDocument();
  });
});
