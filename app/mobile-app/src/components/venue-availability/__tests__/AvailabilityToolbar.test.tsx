import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { AvailabilityToolbar } from '../AvailabilityToolbar';
import type { CalendarView } from '../availability-grid';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = (view: CalendarView = 'month', canGoNext = true) => {
  const handlers = {
    onView: jest.fn(),
    onShift: jest.fn(),
    onToday: jest.fn(),
    onRecurring: jest.fn(),
  };
  renderWithProviders(
    <AvailabilityToolbar
      view={view}
      periodLabel="January 2030"
      canGoNext={canGoNext}
      {...handlers}
    />,
  );
  return handlers;
};

describe('AvailabilityToolbar', () => {
  it('shows the period label between the arrows', () => {
    mount();
    expect(screen.getByTestId('availability-period')).toHaveTextContent('January 2030');
  });

  it.each(['day', 'week', 'month'] as const)(
    'marks only the active view (%s) as chosen',
    (view) => {
      mount(view);
      for (const option of ['day', 'week', 'month'] as const) {
        expect(screen.getByTestId(`availability-view-${option}`).props['aria-checked']).toBe(
          option === view,
        );
      }
    },
  );

  it('switches view', () => {
    const { onView } = mount('month');
    fireEvent.press(screen.getByTestId('availability-view-week'));
    fireEvent.press(screen.getByTestId('availability-view-day'));
    expect(onView).toHaveBeenNthCalledWith(1, 'week');
    expect(onView).toHaveBeenNthCalledWith(2, 'day');
  });

  it('steps back and forward by one period', () => {
    const { onShift } = mount();
    fireEvent.press(screen.getByTestId('availability-period-prev'));
    fireEvent.press(screen.getByTestId('availability-period-next'));
    expect(onShift).toHaveBeenNthCalledWith(1, -1);
    expect(onShift).toHaveBeenNthCalledWith(2, 1);
  });

  it('cannot step past the end of the booking window', async () => {
    const { onShift } = mount('month', false);
    const next = screen.getByTestId('availability-period-next');
    expect(next.props['aria-disabled']).toBe(true);
    await userEvent.setup().press(next);
    expect(onShift).not.toHaveBeenCalled();
    expect(screen.getByTestId('availability-period-prev').props['aria-disabled']).toBe(false);
  });

  it('jumps to today and opens the recurring sheet', () => {
    const { onToday, onRecurring } = mount();
    fireEvent.press(screen.getByTestId('availability-today'));
    fireEvent.press(screen.getByTestId('availability-recurring'));
    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onRecurring).toHaveBeenCalledTimes(1);
  });

  it('names the controls for a screen reader', () => {
    mount();
    expect(screen.getByLabelText('availability.toolbar.calendarView')).toBeOnTheScreen();
    expect(screen.getByLabelText('availability.toolbar.previous')).toBeOnTheScreen();
    expect(screen.getByLabelText('availability.toolbar.next')).toBeOnTheScreen();
  });
});
