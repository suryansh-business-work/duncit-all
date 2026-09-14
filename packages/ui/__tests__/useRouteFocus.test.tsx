import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, useSearchParams } from 'react-router';
import { useRouteFocus } from '../src/useRouteFocus';

/** A page region with a nav link outside it, a query-only control and an in-page link. */
function Page({ withTarget = true }: Readonly<{ withTarget?: boolean }>) {
  const ref = useRef<HTMLElement>(null);
  const [, setParams] = useSearchParams();
  useRouteFocus(ref);
  return (
    <>
      <Link to="/pods">pods</Link>
      <button type="button" onClick={() => setParams({ selectedtab: 'past' })}>
        past
      </button>
      {withTarget && (
        <main ref={ref} tabIndex={-1} data-testid="route-main">
          <Link to="/pods/DUN-POD-4821">DUN-POD-4821</Link>
        </main>
      )}
    </>
  );
}

function renderPage(withTarget?: boolean) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Page withTarget={withTarget} />
    </MemoryRouter>,
  );
}

describe('useRouteFocus', () => {
  it('leaves focus alone on the first render', () => {
    renderPage();
    expect(screen.getByTestId('route-main')).not.toHaveFocus();
  });

  it('moves focus to the page region when the pathname changes from outside it', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(screen.getByRole('link', { name: 'pods' }));
    expect(screen.getByTestId('route-main')).toHaveFocus();
  });

  it('keeps focus that is already inside the page region', async () => {
    const u = userEvent.setup();
    renderPage();
    const inPage = screen.getByRole('link', { name: 'DUN-POD-4821' });
    await u.click(inPage);
    expect(inPage).toHaveFocus();
  });

  it('keeps focus on the control when only the query string changes', async () => {
    const u = userEvent.setup();
    renderPage();
    const tab = screen.getByRole('button', { name: 'past' });
    await u.click(tab);
    expect(tab).toHaveFocus();
  });

  it('does nothing when no page region is mounted', async () => {
    const u = userEvent.setup();
    renderPage(false);
    const link = screen.getByRole('link', { name: 'pods' });
    await u.click(link);
    expect(link).toHaveFocus();
  });
});
