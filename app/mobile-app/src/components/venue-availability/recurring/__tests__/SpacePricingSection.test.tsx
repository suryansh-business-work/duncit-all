import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import type { SpaceRow } from '../recurring-form';
import { SpacePricingSection } from '../SpacePricingSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const NAMED: SpaceRow[] = [
  { label: 'Court 1', capacity: 4, price: '300', enabled: true },
  { label: 'Court 2', capacity: 8, price: '500', enabled: false },
];
const WHOLE: SpaceRow[] = [{ label: '', capacity: 20, price: '399', enabled: true }];

const mount = (spaces: SpaceRow[]) => {
  const onChange = jest.fn();
  renderWithProviders(<SpacePricingSection spaces={spaces} onChange={onChange} />);
  return onChange;
};

describe('SpacePricingSection', () => {
  it('lists each space with its capacity and price', () => {
    mount(NAMED);
    expect(screen.getByText('Court 1')).toBeOnTheScreen();
    expect(screen.getByText('availability.recurring.capacity|4')).toBeOnTheScreen();
    expect(screen.getByTestId('field-recurring-space-Court 1-price').props.value).toBe('300');
    expect(screen.getByTestId('field-recurring-space-Court 2-price').props.value).toBe('500');
  });

  it('lets named spaces be included or left out of the run', () => {
    mount(NAMED);
    expect(screen.getByTestId('recurring-space-Court 1-include').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('recurring-space-Court 2-include').props['aria-checked']).toBe(false);
    expect(screen.getByLabelText('availability.recurring.includeSpace|Court 1')).toBeOnTheScreen();
  });

  it('turns a space on or off, leaving the others as they are', () => {
    const onChange = mount(NAMED);
    fireEvent.press(screen.getByTestId('recurring-space-Court 2-include'));
    expect(onChange).toHaveBeenCalledWith([NAMED[0], { ...NAMED[1], enabled: true }]);
    fireEvent.press(screen.getByTestId('recurring-space-Court 1-include'));
    expect(onChange).toHaveBeenLastCalledWith([{ ...NAMED[0], enabled: false }, NAMED[1]]);
  });

  it('sets the price of one space only', () => {
    const onChange = mount(NAMED);
    fireEvent.changeText(screen.getByTestId('field-recurring-space-Court 1-price'), '350');
    expect(onChange).toHaveBeenCalledWith([{ ...NAMED[0], price: '350' }, NAMED[1]]);
  });

  it('locks the price of a space that is left out', () => {
    mount(NAMED);
    expect(screen.getByTestId('field-recurring-space-Court 2-price').props['aria-disabled']).toBe(
      true,
    );
    expect(screen.getByTestId('field-recurring-space-Court 1-price').props['aria-disabled']).toBe(
      false,
    );
  });

  it('shows a single unnamed space as the whole venue, with no include toggle', () => {
    mount(WHOLE);
    expect(screen.getByText('availability.wholeVenue')).toBeOnTheScreen();
    expect(screen.queryByTestId('recurring-space-whole-venue-include')).toBeNull();
    expect(screen.getByTestId('field-recurring-space-whole-venue-price').props.value).toBe('399');
  });

  it('prices the whole venue', () => {
    const onChange = mount(WHOLE);
    fireEvent.changeText(screen.getByTestId('field-recurring-space-whole-venue-price'), '450');
    expect(onChange).toHaveBeenCalledWith([{ ...WHOLE[0], price: '450' }]);
  });

  it('keeps the include toggle for one named space', () => {
    mount([{ label: 'Court 1', capacity: 4, price: '300', enabled: true }]);
    expect(screen.getByTestId('recurring-space-Court 1-include')).toBeOnTheScreen();
  });
});
