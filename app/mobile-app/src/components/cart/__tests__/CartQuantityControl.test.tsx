import { MaterialIcons } from '@expo/vector-icons';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { useTranslation } from '@/hooks/useTranslation';
import { renderWithProviders } from '@/utils/test-utils';

type ControlProps = Omit<Parameters<typeof CartQuantityControl>[0], 'labels'>;

/** The control as a card mounts it: copy from the real bundle, named for the product. */
function Control(props: Readonly<ControlProps>) {
  const { t } = useTranslation();
  return <CartQuantityControl {...props} labels={cartControlLabels(t, 'Masala Chai')} />;
}

const iconOf = (testID: string): string =>
  within(screen.getByTestId(testID)).UNSAFE_getByType(MaterialIcons).props.name;

describe('CartQuantityControl', () => {
  it('is a lone named "+" until the product is in the cart, and adds one', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={0} max={5} onChange={onChange} />);

    const add = screen.getByTestId('cart-control-add');
    expect(add.props['aria-label']).toBe('Add Masala Chai');
    expect(add.props['aria-disabled']).toBe(false);
    expect(iconOf('cart-control-add')).toBe('add');
    // No pill yet.
    expect(screen.queryByTestId('cart-control')).toBeNull();
    expect(screen.queryByTestId('cart-control-count')).toBeNull();

    fireEvent.press(add);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('turns into the pill at one, with a bin that takes the product out', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={1} max={5} onChange={onChange} />);

    expect(screen.queryByTestId('cart-control-add')).toBeNull();
    expect(screen.getByTestId('cart-control').props['aria-label']).toBe('Masala Chai quantity');
    expect(screen.getByTestId('cart-control-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-control-count').props['aria-live']).toBe('polite');

    const decrease = screen.getByTestId('cart-control-decrease');
    expect(iconOf('cart-control-decrease')).toBe('delete-outline');
    expect(decrease.props['aria-label']).toBe('Remove Masala Chai');
    fireEvent.press(decrease);
    expect(onChange).toHaveBeenLastCalledWith(0);

    const increase = screen.getByTestId('cart-control-increase');
    expect(increase.props['aria-label']).toBe('Add one more Masala Chai');
    fireEvent.press(increase);
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('shows a minus instead of the bin from two up', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={2} max={5} onChange={onChange} />);

    expect(iconOf('cart-control-decrease')).toBe('remove');
    expect(screen.getByTestId('cart-control-decrease').props['aria-label']).toBe(
      'Remove one Masala Chai',
    );
    fireEvent.press(screen.getByTestId('cart-control-decrease'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('stops the plus at the stock but still lets the quantity come down', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={3} max={3} onChange={onChange} />);

    const increase = screen.getByTestId('cart-control-increase');
    expect(increase.props['aria-disabled']).toBe(true);
    fireEvent.press(increase);
    expect(onChange).not.toHaveBeenCalled();

    expect(screen.getByTestId('cart-control-decrease').props['aria-disabled']).toBe(false);
    fireEvent.press(screen.getByTestId('cart-control-decrease'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('cannot add a product with no stock', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={0} max={0} onChange={onChange} />);

    const add = screen.getByTestId('cart-control-add');
    expect(add.props['aria-disabled']).toBe(true);
    fireEvent.press(add);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a spinner and ignores taps while busy', () => {
    const onChange = jest.fn();
    const { rerender } = renderWithProviders(
      <Control quantity={0} max={5} busy onChange={onChange} />,
    );

    const add = screen.getByTestId('cart-control-add');
    expect(add.props['aria-busy']).toBe(true);
    expect(add.props['aria-disabled']).toBe(true);
    expect(screen.getByTestId('cart-control-add-busy')).toBeOnTheScreen();
    fireEvent.press(add);
    expect(onChange).not.toHaveBeenCalled();

    // The pill is just as inert while a change is on its way.
    rerender(<Control quantity={2} max={5} busy onChange={onChange} />);
    expect(screen.getByTestId('cart-control-increase-busy')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('cart-control-increase'));
    fireEvent.press(screen.getByTestId('cart-control-decrease'));
    expect(onChange).not.toHaveBeenCalled();

    rerender(<Control quantity={2} max={5} onChange={onChange} />);
    expect(screen.queryByTestId('cart-control-increase-busy')).toBeNull();
    fireEvent.press(screen.getByTestId('cart-control-increase'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('is inert on both sides when disabled', () => {
    const onChange = jest.fn();
    renderWithProviders(<Control quantity={2} max={5} disabled onChange={onChange} />);

    expect(screen.getByTestId('cart-control-decrease').props['aria-disabled']).toBe(true);
    expect(screen.getByTestId('cart-control-increase').props['aria-disabled']).toBe(true);
    fireEvent.press(screen.getByTestId('cart-control-decrease'));
    fireEvent.press(screen.getByTestId('cart-control-increase'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives every part a 44pt touch target and honours its test ids', () => {
    renderWithProviders(
      <Control
        quantity={2}
        max={5}
        size="sm"
        onChange={jest.fn()}
        testIdPrefix="line-a"
        testIds={{ decrease: 'line-minus-a' }}
      />,
    );
    const minus = screen.getByTestId('line-minus-a');
    const plus = screen.getByTestId('line-a-increase');
    expect(screen.getByTestId('line-a-count')).toHaveTextContent('2');
    for (const part of [minus, plus]) {
      const { width, height } = part.props.style;
      const slop = part.props.hitSlop;
      expect(width + slop * 2).toBe(44);
      expect(height + slop * 2).toBe(44);
    }
  });
});
