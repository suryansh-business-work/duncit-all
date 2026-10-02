import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { PageErrorBoundary } from '../src/auth/PageErrorBoundary';
import { createAuthed } from '../src/auth/RequireAuth';

/**
 * A crash in one page must not white-screen the portal: the boundary shows a
 * recoverable panel, logs the crash, and clears itself on navigation.
 */
let shouldThrow = true;
let message = 'Venue form exploded';

function Flaky() {
  if (shouldThrow) throw new Error(message);
  return <p>Venue editor</p>;
}

function GoElsewhere() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/venues')}>leave</button>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GoElsewhere />
      <Routes>
        <Route
          path="*"
          element={
            <PageErrorBoundary>
              <Flaky />
            </PageErrorBoundary>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  shouldThrow = true;
  message = 'Venue form exploded';
  // React reports every caught render error to console.error; keep the run quiet.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PageErrorBoundary', () => {
  it('renders the page untouched when nothing throws', () => {
    shouldThrow = false;
    renderAt('/venues/new');
    expect(screen.getByText('Venue editor')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the crash message instead of a white screen, and Try again re-renders', async () => {
    renderAt('/venues/new');
    expect(screen.getByRole('alert')).toHaveTextContent('Venue form exploded');

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Venue editor')).toBeInTheDocument();
  });

  it('falls back to the generic copy when the error has no message', () => {
    message = '';
    renderAt('/venues/new');
    expect(screen.getByRole('alert')).toHaveTextContent('An unexpected error occurred');
  });

  it('reloads the page from the panel', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...globalThis.location, reload });
    renderAt('/venues/new');
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('clears itself when the person navigates to another page', async () => {
    renderAt('/venues/new');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'leave' }));
    expect(screen.getByText('Venue editor')).toBeInTheDocument();
  });

  it('keeps a working page mounted across navigation', async () => {
    shouldThrow = false;
    renderAt('/venues/new');
    await userEvent.click(screen.getByRole('button', { name: 'leave' }));
    expect(screen.getByText('Venue editor')).toBeInTheDocument();
  });
});

describe('createAuthed', () => {
  it('puts the boundary inside the chrome, so the chrome survives a page crash', () => {
    const authed = createAuthed({
      getToken: () => 'tok',
      wrap: (el) => <nav data-testid="chrome">{el}</nav>,
    });
    render(
      <MemoryRouter initialEntries={['/venues/new']}>
        <Routes>
          <Route path="/venues/new" element={authed(<Flaky />)} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('chrome')).toContainElement(screen.getByRole('alert'));
  });
});
