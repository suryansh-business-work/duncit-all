import { Suspense } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { LITE_MY_EVENTS } from '../../../graphql/events';
import { HomeGate } from '../../../pages/landing/HomeGate';
import { discoverFixture, discoverMock } from '../discover/discover-fixtures';
import { meFixture, renderWithProviders } from '../../test-utils';

/** The page behind the gate is code-split; its first import can take longer than findBy's default second. */
const LAZY = { timeout: 5000 };

/** The app shell's Suspense boundary, which the lazy pages load under. */
const gate = (
  <Suspense fallback={null}>
    <HomeGate />
  </Suspense>
);

const noEvents = (scope: 'HOSTING' | 'ATTENDING'): MockedResponse => ({
  request: { query: LITE_MY_EVENTS, variables: { scope, past: false } },
  result: { data: { liteMyEvents: [] } },
});

describe('HomeGate', () => {
  it('shows a visitor the landing page', async () => {
    renderWithProviders(gate, { mocks: [discoverMock(discoverFixture())] });
    expect(await screen.findByTestId('landing-page', {}, LAZY)).toBeInTheDocument();
    expect(screen.queryByTestId('events-home-page')).not.toBeInTheDocument();
  });

  it('shows a signed-in reader their own events instead of the landing page', async () => {
    renderWithProviders(gate, { me: meFixture(), mocks: [noEvents('HOSTING'), noEvents('ATTENDING')] });
    expect(await screen.findByTestId('events-home-page', {}, LAZY)).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    expect(await screen.findByTestId('home-empty')).toHaveTextContent('No upcoming events');
  });
});
