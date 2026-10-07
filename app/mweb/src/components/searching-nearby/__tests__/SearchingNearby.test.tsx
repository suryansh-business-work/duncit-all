import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SearchingNearby } from '..';

describe('SearchingNearby', () => {
  it('announces the search politely as a status, with its title and hint', () => {
    render(
      <SearchingNearby
        title="Searching Nearby Hosts..."
        hint="Looking within 5 km of Gomti Nagar"
        icon={<span data-testid="centre-icon" />}
        testId="radar"
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-testid', 'radar');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Searching Nearby Hosts...');
    expect(status).toHaveTextContent('Looking within 5 km of Gomti Nagar');
    expect(screen.getByTestId('centre-icon')).toBeInTheDocument();
  });

  it('hides the decorative radar from screen readers and defaults its test id', () => {
    render(<SearchingNearby title="Searching" hint="Hint" icon={<span data-testid="centre-icon" />} />);

    expect(screen.getByTestId('searching-nearby')).toBeInTheDocument();
    expect(screen.getByTestId('centre-icon').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
