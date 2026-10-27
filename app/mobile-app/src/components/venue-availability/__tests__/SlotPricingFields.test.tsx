import { fireEvent, screen } from '@testing-library/react-native';
import type { SlotDraft } from '@duncit/slots';

import { renderWithProviders } from '@/utils/test-utils';
import { SlotPricingFields } from '../SlotPricingFields';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = (draft: Pick<SlotDraft, 'price' | 'pricingMode' | 'overtimeRate'>) => {
  const patch = jest.fn();
  renderWithProviders(<SlotPricingFields draft={draft} patch={patch} />);
  return patch;
};

describe('SlotPricingFields', () => {
  it('offers the three ways to charge, marking the current one', () => {
    mount({ price: '400', pricingMode: 'HOURLY', overtimeRate: '' });
    expect(screen.getByTestId('add-slot-pricing-mode-FLAT').props['aria-checked']).toBe(false);
    expect(screen.getByTestId('add-slot-pricing-mode-HOURLY').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('add-slot-pricing-mode-PER_PAX').props['aria-checked']).toBe(false);
  });

  it('switches the pricing mode', () => {
    const patch = mount({ price: '400', pricingMode: 'FLAT', overtimeRate: '' });
    fireEvent.press(screen.getByTestId('add-slot-pricing-mode-PER_PAX'));
    expect(patch).toHaveBeenCalledWith({ pricingMode: 'PER_PAX' });
  });

  it('explains per-guest pricing only when it is chosen', () => {
    mount({ price: '400', pricingMode: 'PER_PAX', overtimeRate: '' });
    expect(screen.getByTestId('add-slot-pricing-mode-hint')).toHaveTextContent(
      'availability.pricingHint',
    );
  });

  it('shows no pricing hint for the other modes', () => {
    mount({ price: '400', pricingMode: 'FLAT', overtimeRate: '' });
    expect(screen.queryByTestId('add-slot-pricing-mode-hint')).toBeNull();
  });

  it('shows the price and overtime rate as typed and patches each as it changes', () => {
    const patch = mount({ price: '400', pricingMode: 'HOURLY', overtimeRate: '150' });
    expect(screen.getByTestId('field-add-slot-price').props.value).toBe('400');
    expect(screen.getByTestId('field-add-slot-overtime').props.value).toBe('150');
    fireEvent.changeText(screen.getByTestId('field-add-slot-price'), '450');
    fireEvent.changeText(screen.getByTestId('field-add-slot-overtime'), '200');
    expect(patch).toHaveBeenNthCalledWith(1, { price: '450' });
    expect(patch).toHaveBeenNthCalledWith(2, { overtimeRate: '200' });
  });
});
