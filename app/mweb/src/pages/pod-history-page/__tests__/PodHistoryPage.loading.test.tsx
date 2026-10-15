import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import PodHistoryPage from '../PodHistoryPage';
import { MY_POD_MEMBERSHIPS } from '../queries';

describe('PodHistoryPage — first load', () => {
  it('shows the "Did you know?" tips loader, whose spinner is the only thing announced', () => {
    render(
      <MockedProvider mocks={[{ request: { query: MY_POD_MEMBERSHIPS }, result: { data: { myPodMemberships: [] } }, delay: 10_000 }]}>
        <MemoryRouter>
          <PodHistoryPage />
        </MemoryRouter>
      </MockedProvider>,
    );
    const loader = screen.getByTestId('pod-history-loading');
    expect(loader).toHaveTextContent('Did you know?');
    expect(screen.getByTestId('pod-history-loading-tip')).toHaveTextContent(
      'Tap any pod you joined to see its refund status and full timeline.',
    );
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Loading…');
  });
});
