import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { PageErrorBoundary } from '../src/auth/PageErrorBoundary';
import { createAuthed } from '../src/auth/RequireAuth';

/**
 * A crash in one page must not white-screen the portal: the boundary shows a
 * recoverable panel, and clears itself on navigation.
 */
let shouldThrow = true;

function Flaky() {
  if (shouldThrow) throw new Error('Venue form exploded');
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

  it('shows Retry and Report an Issue instead of a white screen, never the raw error, and Retry re-renders', async () => {
    renderAt('/venues/new');
    const panel = screen.getByRole('alert');
    expect(panel).toHaveAttribute('data-testid', 'error-boundary-fallback');
    expect(panel).not.toHaveTextContent('Venue form exploded');
    expect(screen.getByTestId('error-boundary-report')).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByText('Venue editor')).toBeInTheDocument();
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
