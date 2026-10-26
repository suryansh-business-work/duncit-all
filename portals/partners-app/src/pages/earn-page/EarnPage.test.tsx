import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import EarnPage from './EarnPage';
import { urlConfigs } from '../../config/url-configs';
import { renderWithProviders } from '../../__tests__/render';

/**
 * The journey cards are @duncit/earn's. They are stubbed to print which journeys
 * they were asked for and to hand back, through the real surface context, the
 * three ways a card can act — so what this page wires them to is what is tested.
 */
vi.mock('@duncit/earn', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/earn')>();
  return {
    ...actual,
    useEarnProductsVisible: () => true,
    EarnJourneyList: ({ kinds, showProducts }: { kinds: readonly string[]; showProducts: boolean }) => {
      const surface = actual.useEarnSurface();
      return (
        <section data-testid="journeys">
          <output data-testid="kinds">{`${kinds.join(',')}|products:${showProducts}`}</output>
          <button type="button" onClick={() => surface.openJourney({ surveyPath: '/survey/host' } as never)}>
            open journey
          </button>
          <button type="button" onClick={() => surface.runCta({ target: 'internal', internalTo: '/host/pods' } as never)}>
            run internal cta
          </button>
          <button type="button" onClick={() => surface.runCta({ target: 'partner', partnerPath: '/host/pods' } as never)}>
            run partner cta
          </button>
        </section>
      );
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EarnPage', () => {
  it('opens the whole menu of ways to earn when no journey is chosen', () => {
    renderWithProviders(<EarnPage />, { route: '/earn' });
    expect(screen.getByRole('heading', { name: 'Earn with Duncit' })).toBeTruthy();
    expect(screen.getByText('Pick a way to start earning on Duncit.')).toBeTruthy();
    expect(screen.getByTestId('kinds').textContent).toMatch(/HOST.*\|products:true/);
    expect(screen.getByTestId('kinds').textContent?.split('|')[0].split(',').length).toBeGreaterThan(1);
    expect(screen.queryByRole('link', { name: 'See all the ways to earn with Duncit' })).toBeNull();
  });

  it('narrows the page to the host journey, named after the sidebar entry that opened it', () => {
    renderWithProviders(<EarnPage focus="HOST" />, { route: '/host/be-a-host' });
    expect(screen.getByRole('heading', { name: 'Be a Host' })).toBeTruthy();
    expect(screen.getByText('Start here — the steps below are your onboarding.')).toBeTruthy();
    expect(screen.getByTestId('kinds').textContent).toBe('HOST|products:true');
  });

  it('narrows the page to the brand journey and links back to every way to earn', async () => {
    renderWithProviders(<EarnPage focus="ECOMM" />, { route: '/ecomm-brand/become' });
    expect(screen.getByRole('heading', { name: 'Become an E-Commerce Brand Partner' })).toBeTruthy();
    expect(screen.getByTestId('kinds').textContent).toBe('ECOMM|products:true');
    fireEvent.click(screen.getByRole('link', { name: 'See all the ways to earn with Duncit' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/earn'));
  });

  it('opens an unlocked journey’s application on mWeb in a new tab', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    renderWithProviders(<EarnPage />, { route: '/earn' });
    fireEvent.click(screen.getByRole('button', { name: 'open journey' }));
    expect(open).toHaveBeenCalledWith(`${urlConfigs.mwebUrl}/survey/host`, '_blank', 'noopener,noreferrer');
  });

  it('opens an internal next step on mWeb and keeps a partner next step inside this console', async () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    renderWithProviders(<EarnPage />, { route: '/earn' });
    fireEvent.click(screen.getByRole('button', { name: 'run internal cta' }));
    expect(open).toHaveBeenCalledWith(`${urlConfigs.mwebUrl}/host/pods`, '_blank', 'noopener,noreferrer');
    expect(screen.getByTestId('location').textContent).toBe('/earn');

    fireEvent.click(screen.getByRole('button', { name: 'run partner cta' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/host/pods'));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
