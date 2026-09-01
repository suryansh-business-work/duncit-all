/**
 * The package's translator, layered UNDER the host surface's.
 *
 * Inside a LocaleProvider the shared hook returns the PROVIDER's translator and
 * ignores the fallback handed to it, so the package's own keys have to be
 * answered by a local translator — but only the keys the provider has never
 * heard of, so a translated entry still reaches the screen.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@duncit/app-settings';
import { describe, expect, it } from 'vitest';

import { PODDETAILSPANEL_FALLBACK_FLAT, useTranslation } from '../src/i18n/useTranslation';

const KNOWN = 'podDetailsPanel.podClubCard.club';
const LOCAL_ONLY = 'podDetailsPanel.podClubCard.viewClub';
const NOWHERE = 'podDetailsPanel.podClubCard.doesNotExist';

function Probe() {
  const { t, has } = useTranslation();
  return (
    <ul>
      <li data-testid="known">{t(KNOWN)}</li>
      <li data-testid="local">{t(LOCAL_ONLY)}</li>
      <li data-testid="has-known">{String(has(KNOWN))}</li>
      <li data-testid="has-local">{String(has(LOCAL_ONLY))}</li>
      <li data-testid="has-nowhere">{String(has(NOWHERE))}</li>
    </ul>
  );
}

describe('useTranslation', () => {
  it('ships every key of the shared bundle as its local fallback', () => {
    expect(PODDETAILSPANEL_FALLBACK_FLAT[KNOWN]).toBe('Club');
    expect(PODDETAILSPANEL_FALLBACK_FLAT[LOCAL_ONLY]).toBe('View club');
  });

  it('lets the provider’s copy win, and answers the rest from the local bundle', () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <LocaleProvider fallback={{ [KNOWN]: 'Klub' }}>
          <Probe />
        </LocaleProvider>
      </MockedProvider>,
    );

    expect(screen.getByTestId('known').textContent).toBe('Klub');
    expect(screen.getByTestId('local').textContent).toBe('View club');
    expect(screen.getByTestId('has-known').textContent).toBe('true');
    expect(screen.getByTestId('has-local').textContent).toBe('true');
    expect(screen.getByTestId('has-nowhere').textContent).toBe('false');
  });

  it('renders real copy with no provider above it at all', () => {
    render(<Probe />);

    expect(screen.getByTestId('known').textContent).toBe('Club');
    expect(screen.getByTestId('local').textContent).toBe('View club');
    expect(screen.getByTestId('has-nowhere').textContent).toBe('false');
  });
});
