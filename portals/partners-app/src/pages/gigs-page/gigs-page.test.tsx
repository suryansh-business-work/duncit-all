import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { logs } from '@duncit/logs';
import { FREELANCER_PROFILE_PATH } from '@duncit/utils';
import { GigDetailPage, GigEditorPage, GigsPage, MyGigsPage } from '.';
import { urlConfigs } from '../../config/url-configs';
import { renderWithProviders } from '../../__tests__/render';

/**
 * The gig screens are @duncit/gig-jobs' and have their own suite. Each is stubbed
 * to show what it was given and to offer the two ways out the Partners console
 * wires (navigate, open the freelancer profile) through the real surface context.
 */
const { surfaces } = vi.hoisted(() => ({ surfaces: [] as { logger: unknown }[] }));

vi.mock(import('@duncit/gig-jobs'), async (importOriginal) => {
  const actual = await importOriginal();
  const Probe = ({ name, id }: Readonly<{ name: string; id?: string }>) => {
    const surface = actual.useGigSurface();
    surfaces.push(surface);
    return (
      <section data-testid={`stub-${name}`}>
        {`${name}:${id ?? 'none'}`}
        <button type="button" onClick={() => surface.go('/gigs/g9')}>
          go
        </button>
        <button type="button" onClick={surface.openFreelancerProfile}>
          profile
        </button>
      </section>
    );
  };
  return {
    ...actual,
    GigBoard: (() => <Probe name="board" />) as never,
    MyGigJobs: (() => <Probe name="mine" />) as never,
    GigJobDetail: ((props: { id: string }) => <Probe name="detail" id={props.id} />) as never,
    GigJobEditor: ((props: { id?: string }) => <Probe name="editor" id={props.id} />) as never,
  };
});

afterEach(() => {
  cleanup();
  surfaces.length = 0;
  vi.restoreAllMocks();
});

describe('Gig pages', () => {
  it('shows the board', () => {
    renderWithProviders(<GigsPage />, { route: '/gigs' });
    expect(screen.getByTestId('stub-board').textContent).toContain('board:none');
  });

  it('shows the partner’s own gigs', () => {
    renderWithProviders(<MyGigsPage />, { route: '/gigs/mine' });
    expect(screen.getByTestId('stub-mine').textContent).toContain('mine:none');
  });

  it('opens the gig named in the route', () => {
    renderWithProviders(<GigDetailPage />, { route: '/gigs/g1', path: '/gigs/:id' });
    expect(screen.getByTestId('stub-detail').textContent).toContain('detail:g1');
  });

  it('edits the gig named in the route', () => {
    renderWithProviders(<GigEditorPage />, { route: '/gigs/g1/edit', path: '/gigs/:id/edit' });
    expect(screen.getByTestId('stub-editor').textContent).toContain('editor:g1');
  });

  it('starts a new gig when the route names none', () => {
    renderWithProviders(<GigEditorPage />, { route: '/gigs/new', path: '/gigs/new' });
    expect(screen.getByTestId('stub-editor').textContent).toContain('editor:none');
  });

  it('gives the screens a surface that navigates inside the console and logs to it', async () => {
    renderWithProviders(<GigsPage />, { route: '/gigs' });
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/gigs/g9'));
    expect(surfaces.at(-1)?.logger).toBe(logs.portal['partners-app']);
  });

  it('opens the freelancer profile on mWeb in a new tab, without leaking the opener', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    renderWithProviders(<GigsPage />, { route: '/gigs' });
    fireEvent.click(screen.getByRole('button', { name: 'profile' }));
    expect(open).toHaveBeenCalledWith(`${urlConfigs.mwebUrl}${FREELANCER_PROFILE_PATH}`, '_blank', 'noopener,noreferrer');
  });
});
