import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import ReelStudioMovedPage, { REEL_STUDIO_PATH } from '../../src/pages/reels-moved';
import { urlConfigs } from '../../src/config/url-configs';
import { renderWithProviders } from '../testkit';

const mount = (entry: string) =>
  renderWithProviders(<ReelStudioMovedPage />, {
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/reels" element={<ReelStudioMovedPage />} />
        <Route path="/reels/:projectId" element={<ReelStudioMovedPage />} />
      </>
    ),
  });

describe('ReelStudioMovedPage', () => {
  it('says the studio moved and opens the Marketing console in a new tab', () => {
    mount('/reels');
    expect(screen.getByTestId('reel-studio-moved')).toHaveTextContent('Reel Studio has moved');
    const open = screen.getByTestId('reel-studio-moved-open');
    expect(open).toHaveAttribute('href', `${urlConfigs.marketingUrl}${REEL_STUDIO_PATH}`);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('takes a link to one reel to that same reel in the new studio', () => {
    mount('/reels/DUN-REEL-7');
    expect(screen.getByTestId('reel-studio-moved-open')).toHaveAttribute(
      'href',
      `${urlConfigs.marketingUrl}${REEL_STUDIO_PATH}/DUN-REEL-7`
    );
  });

  it('points at the Marketing console, never at this one', () => {
    expect(urlConfigs.marketingUrl).toMatch(/^https?:\/\//);
    expect(urlConfigs.marketingUrl).not.toBe(urlConfigs.graphqlUrl);
  });
});
