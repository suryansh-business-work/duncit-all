import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { NotificationChip } from '@duncit/utils';

import NotificationFilterChips from '../NotificationFilterChips';
import NotificationsHero from '../NotificationsHero';
import NotificationsList from '../NotificationsList';

// The row is covered by notification-rows.test; here it only reports what the
// list handed it, so the list's own wiring (busy, click, refresh) is what is read.
vi.mock('../NotificationRow', () => ({
  default: ({ item, busy, onClick, onAnswered }: any) => (
    <button type="button" data-testid={`row-${item.id}`} data-busy={String(busy)} onClick={onClick}>
      {item.title}
      <span data-testid={`answered-${item.id}`} onClick={onAnswered} />
    </button>
  ),
}));

const theme = createTheme();
const inTheme = (ui: React.ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const chip = (key: string, label: string, count: number) => ({ key, label, count }) as unknown as NotificationChip;

describe('NotificationFilterChips', () => {
  it('draws nothing when there is only "all" and one category to choose from', () => {
    const { container } = inTheme(
      <NotificationFilterChips chips={[chip('all', 'All', 3), chip('pods', 'Pods', 3)]} value={'all' as never} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each category with its count, marks the chosen one, and reports a pick', () => {
    const onChange = vi.fn();
    inTheme(
      <NotificationFilterChips
        chips={[chip('all', 'All', 5), chip('pods', 'Pods', 3), chip('social', 'Social', 2)]}
        value={'pods' as never}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId('notif-chip-all')).toHaveTextContent('All 5');
    expect(screen.getByTestId('notif-chip-pods')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('notif-chip-social')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('notif-chip-social'));
    expect(onChange).toHaveBeenCalledWith('social');
  });
});

describe('NotificationsHero', () => {
  it('draws nothing where the browser cannot push', () => {
    const { container } = inTheme(
      <NotificationsHero pushSupported={false} pushOn={false} pushBusy={false} onToggle={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('reflects the current state and reports the new one when switched', () => {
    const onToggle = vi.fn();
    inTheme(<NotificationsHero pushSupported pushOn={false} pushBusy={false} onToggle={onToggle} />);
    const input = screen.getByLabelText('Allow notifications');
    expect(input).not.toBeChecked();
    fireEvent.click(input);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('locks the switch while the permission is being changed', () => {
    inTheme(<NotificationsHero pushSupported pushOn pushBusy onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Allow notifications')).toBeChecked();
    expect(screen.getByLabelText('Allow notifications')).toBeDisabled();
  });
});

describe('NotificationsList', () => {
  const visible = [
    { id: 'n1', title: 'Pod confirmed' },
    { id: 'n2', title: 'New follower' },
  ] as never[];

  it('renders one row per notification and forwards the pressed one', () => {
    const onNotifClick = vi.fn();
    inTheme(<NotificationsList visible={visible} busyId={null} markAllBusy={false} onNotifClick={onNotifClick} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('row-n2'));
    expect(onNotifClick).toHaveBeenCalledWith(visible[1]);
  });

  it('marks only the busy row as busy, and every row while mark-all runs', () => {
    const { rerender } = inTheme(
      <NotificationsList visible={visible} busyId="n1" markAllBusy={false} onNotifClick={vi.fn()} />,
    );
    expect(screen.getByTestId('row-n1')).toHaveAttribute('data-busy', 'true');
    expect(screen.getByTestId('row-n2')).toHaveAttribute('data-busy', 'false');
    rerender(
      <ThemeProvider theme={theme}>
        <NotificationsList visible={visible} busyId={null} markAllBusy onNotifClick={vi.fn()} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('row-n1')).toHaveAttribute('data-busy', 'true');
    expect(screen.getByTestId('row-n2')).toHaveAttribute('data-busy', 'true');
  });

  it('refreshes the list when a row has been answered', () => {
    const onRefresh = vi.fn();
    inTheme(<NotificationsList visible={visible} busyId={null} markAllBusy={false} onNotifClick={vi.fn()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('answered-n1'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
