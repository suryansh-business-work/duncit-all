import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from '../../../pages/not-found';
import { renderWithProviders } from '../../test-utils';

describe('NotFoundPage', () => {
  it('says the page was not found and offers a way to Discover', () => {
    renderWithProviders(<NotFoundPage />, { route: '/nowhere' });
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    const empty = screen.getByTestId('not-found');
    expect(empty).toHaveTextContent('We could not find that');
    expect(empty).toHaveTextContent('The link may be wrong, or the page was removed.');
    expect(screen.getByRole('link', { name: 'Go to Discover' })).toHaveAttribute('href', '/discover');
  });

  it('names the browser tab', async () => {
    renderWithProviders(<NotFoundPage />, { route: '/nowhere' });
    await waitFor(() => expect(document.title).toBe('Page not found | Duncit Lite'));
  });
});
