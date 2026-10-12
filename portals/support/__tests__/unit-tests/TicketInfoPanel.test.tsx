import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import TicketInfoPanel from '../../src/pages/tickets/TicketDetailPage/TicketInfoPanel';
import { renderWithProviders } from '../testkit';
import { makeTicket } from '../mocks/ticket.mock';

/**
 * The ticket's state chips and who raised it. A desktop gets a column beside
 * the thread; a narrow screen folds it away so the thread keeps the height.
 */
const ticket = makeTicket({ status: 'OPEN', priority: 'HIGH', category: 'PAYMENT' }) as Parameters<
  typeof TicketInfoPanel
>[0]['ticket'];

/** Answers every `min-width` media query with `matches`, as a real browser would. */
const stubViewport = (matches: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: matches && query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TicketInfoPanel', () => {
  it('shows the chips and the requester straight away on a wide screen, with nothing to expand', () => {
    stubViewport(true);
    renderWithProviders(<TicketInfoPanel ticket={ticket} />);

    expect(screen.getByText('HIGH priority')).toBeInTheDocument();
    expect(screen.getByText('PAYMENT')).toBeInTheDocument();
    expect(screen.getByText(ticket.user.name)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('folds the details away on a narrow screen until they are asked for', () => {
    stubViewport(false);
    renderWithProviders(<TicketInfoPanel ticket={ticket} />);

    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const closedLabel = toggle.textContent;

    fireEvent.click(toggle);
    const opened = screen.getByRole('button', { expanded: true });
    expect(opened).toHaveAttribute('aria-expanded', 'true');
    // The label flips so the control always says what it will do next.
    expect(opened.textContent).not.toBe(closedLabel);
    expect(screen.getByText('HIGH priority')).toBeVisible();

    fireEvent.click(opened);
    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent(closedLabel ?? '');
  });
});
