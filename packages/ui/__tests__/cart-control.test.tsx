import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CartControlLabels } from '@duncit/utils';
import { CartQuantityControl, type CartQuantityControlProps } from '../src/cart-control';

const LABELS: CartControlLabels = {
  add: 'Add Masala Chai',
  increase: 'Add one more Masala Chai',
  decrease: 'Remove one Masala Chai',
  remove: 'Remove Masala Chai',
  quantity: 'Masala Chai quantity',
  added: 'Item added',
  removed: 'Item removed',
};

type Overrides = Partial<CartQuantityControlProps>;

function renderControl(overrides: Overrides = {}) {
  const onChange = vi.fn();
  const props = { quantity: 0, max: 5, labels: LABELS, onChange, testIdPrefix: 'chai', ...overrides };
  const view = render(<CartQuantityControl {...props} />);
  return { onChange, ...view };
}

/** The control as a card holds it: the cart answers, the quantity comes back. */
function Live({ start, max = 5 }: Readonly<{ start: number; max?: number }>) {
  const [quantity, setQuantity] = useState(start);
  return (
    <>
      <CartQuantityControl quantity={quantity} max={max} labels={LABELS} onChange={setQuantity} />
      <button type="button" onClick={() => setQuantity(0)}>
        Empty cart
      </button>
    </>
  );
}

describe('CartQuantityControl — not in the cart', () => {
  it('shows one "+" named by the add label and nothing of the pill', () => {
    renderControl();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toBeEnabled();
    expect(screen.getByTestId('chai-add')).toBe(screen.getByRole('button'));
    expect(screen.queryByTestId('chai-qty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chai-dec')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chai-inc')).not.toBeInTheDocument();
  });

  it('adds the first unit', () => {
    const { onChange } = renderControl();
    fireEvent.click(screen.getByRole('button', { name: 'Add Masala Chai' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('turns the "+" off when there is no stock to sell', () => {
    const { onChange } = renderControl({ max: 0 });
    const add = screen.getByRole('button', { name: 'Add Masala Chai' });
    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('turns the "+" off when the control is disabled', () => {
    renderControl({ disabled: true });
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toBeDisabled();
  });

  it('carries no test ids without a prefix', () => {
    renderControl({ testIdPrefix: undefined, quantity: 2 });
    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('data-testid');
    }
    expect(screen.getByRole('status')).not.toHaveAttribute('data-testid');
  });
});

describe('CartQuantityControl — in the cart', () => {
  it('shows a bin, the count and a "+" while one unit is there', () => {
    const { onChange } = renderControl({ quantity: 1 });
    const remove = screen.getByRole('button', { name: 'Remove Masala Chai' });
    expect(remove).toBe(screen.getByTestId('chai-dec'));
    expect(screen.getByTestId('DeleteOutlinedIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('RemoveIcon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove one Masala Chai' })).not.toBeInTheDocument();
    fireEvent.click(remove);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('swaps the bin for a minus from two up, on the same test id', () => {
    const { onChange } = renderControl({ quantity: 2 });
    const minus = screen.getByRole('button', { name: 'Remove one Masala Chai' });
    expect(minus).toBe(screen.getByTestId('chai-dec'));
    expect(screen.getByTestId('RemoveIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('DeleteOutlinedIcon')).not.toBeInTheDocument();
    fireEvent.click(minus);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('announces the count under the quantity label', () => {
    renderControl({ quantity: 3 });
    const count = screen.getByRole('status', { name: 'Masala Chai quantity' });
    expect(count).toBe(screen.getByTestId('chai-qty'));
    expect(count).toHaveTextContent('3');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  it('steps up with the increase label, and renames the "+" test id', () => {
    const { onChange } = renderControl({ quantity: 3 });
    const plus = screen.getByRole('button', { name: 'Add one more Masala Chai' });
    expect(plus).toBe(screen.getByTestId('chai-inc'));
    expect(screen.queryByTestId('chai-add')).not.toBeInTheDocument();
    fireEvent.click(plus);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('stops the "+" at the stock and leaves the minus working', () => {
    const { onChange } = renderControl({ quantity: 5 });
    expect(screen.getByRole('button', { name: 'Add one more Masala Chai' })).toBeDisabled();
    const minus = screen.getByRole('button', { name: 'Remove one Masala Chai' });
    expect(minus).toBeEnabled();
    fireEvent.click(minus);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('turns every button off when disabled', () => {
    const { onChange } = renderControl({ quantity: 2, disabled: true });
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('CartQuantityControl — a change in flight', () => {
  it('ignores taps but keeps the buttons focusable and in place', () => {
    const { onChange } = renderControl({ quantity: 2, busy: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeEnabled();
      fireEvent.click(button);
    }
    expect(onChange).not.toHaveBeenCalled();
    buttons[1].focus();
    expect(buttons[1]).toHaveFocus();
  });

  it('marks nothing as waiting at rest', () => {
    renderControl({ quantity: 2 });
    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('aria-disabled');
    }
  });
});

describe('CartQuantityControl — inside a clickable card', () => {
  function renderInCard(overrides: Overrides = {}) {
    const openCard = vi.fn();
    const onChange = vi.fn();
    render(
      <a href="/product/masala-chai" onClick={openCard}>
        <CartQuantityControl
          quantity={2}
          max={5}
          labels={LABELS}
          onChange={onChange}
          testIdPrefix="chai"
          {...overrides}
        />
      </a>,
    );
    return { openCard, onChange };
  }

  it('does not let a step reach the card, nor follow its link', () => {
    const { openCard, onChange } = renderInCard();
    for (const id of ['chai-inc', 'chai-dec']) {
      const notPrevented = fireEvent.click(screen.getByTestId(id));
      expect(notPrevented).toBe(false);
    }
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(openCard).not.toHaveBeenCalled();
  });

  it('swallows a tap on the count and on a button that is off', () => {
    const { openCard, onChange } = renderInCard({ quantity: 5 });
    expect(fireEvent.click(screen.getByTestId('chai-qty'))).toBe(false);
    // A disabled button lets the pointer through to the shell around it.
    const shell = screen.getByTestId('chai-inc').parentElement as HTMLElement;
    expect(fireEvent.click(shell)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(openCard).not.toHaveBeenCalled();
  });

  it('lets the card open when the tap lands outside the control', () => {
    const { openCard } = renderInCard();
    fireEvent.click(screen.getByRole('link'));
    expect(openCard).toHaveBeenCalledTimes(1);
  });
});

describe('CartQuantityControl — keyboard focus across the two modes', () => {
  it('keeps focus on the "+" when the pill opens around it', () => {
    render(<Live start={0} />);
    const add = screen.getByRole('button', { name: 'Add Masala Chai' });
    add.focus();
    fireEvent.click(add);
    const plus = screen.getByRole('button', { name: 'Add one more Masala Chai' });
    expect(plus).toBe(add);
    expect(plus).toHaveFocus();
  });

  it('hands focus to the "+" when the last unit is removed', () => {
    render(<Live start={1} />);
    const remove = screen.getByRole('button', { name: 'Remove Masala Chai' });
    remove.focus();
    fireEvent.click(remove);
    expect(remove).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toHaveFocus();
  });

  it('leaves focus where the shopper put it after removing', () => {
    render(<Live start={1} />);
    const elsewhere = screen.getByRole('button', { name: 'Empty cart' });
    elsewhere.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Masala Chai' }));
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it('does not take focus when the cart is emptied from somewhere else', () => {
    render(<Live start={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Masala Chai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empty cart' }));
    expect(document.body).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).not.toHaveFocus();
  });
});

describe('CartQuantityControl — size and sx', () => {
  it('draws the small control shorter than the medium one', () => {
    const { unmount } = renderControl({ size: 'small' });
    const small = getComputedStyle(screen.getByTestId('chai-add')).height;
    unmount();
    renderControl();
    const medium = getComputedStyle(screen.getByTestId('chai-add')).height;
    expect(Number.parseInt(small, 10)).toBeLessThan(Number.parseInt(medium, 10));
  });

  it('lets the card place it with sx', () => {
    const { container } = renderControl({ sx: { position: 'absolute' } });
    expect(container.firstChild).toHaveStyle({ position: 'absolute', display: 'inline-flex' });
  });
});
