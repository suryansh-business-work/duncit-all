import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { SmartIncentiveLabels } from '@duncit/utils';
import { SmartIncentiveField, SmartIncentiveInfoDialog } from '../src/smart-incentive';
import type { SmartIncentiveFieldProps } from '../src/smart-incentive';

const LABELS: SmartIncentiveLabels = {
  title: 'Smart Incentive',
  switchLabel: 'Offer a discount to members who are still deciding',
  hint: 'Members who stay on your pod page without booking get a one-time offer.',
  pctLabel: 'Discount %',
  maxHint: (max) => `Up to ${max}% off`,
  pricePreview: (price) => `With the offer, a ticket costs ${price}`,
  learnMore: 'How it works',
  errors: {
    REQUIRED: () => 'Enter the discount',
    PCT_MIN: () => 'Discount must be a whole number of at least 1%',
    PCT_MAX: (max) => `Discount can’t be more than ${max}%`,
  },
  info: {
    title: 'What is Smart Incentive?',
    what: (seconds) => `When a member stays on your pod page for ${seconds} seconds without booking, they see a one-time offer.`,
    who: 'Only members who see the offer get the discount.',
    cut: 'The discount comes out of your share.',
    change: 'You can change the discount or switch it off anytime by editing the pod.',
    gotIt: 'Got it',
  },
};

const rupees = (amount: number) => `₹${amount}`;

/** The editor as a surface mounts it, with whatever a test changes laid over. */
const props = (over: Partial<SmartIncentiveFieldProps> = {}): SmartIncentiveFieldProps => ({
  enabled: false,
  pct: '',
  onEnabledChange: vi.fn(),
  onPctChange: vi.fn(),
  maxPct: 20,
  delaySeconds: 15,
  labels: LABELS,
  ...over,
});

/** A form stand-in that owns the values, so the editor is exercised the way a host uses it. */
function Harness() {
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState('');
  return (
    <SmartIncentiveField
      {...props({ enabled, pct, onEnabledChange: setEnabled, onPctChange: setPct, unitPrice: 500, formatPrice: rupees })}
    />
  );
}

const switchInput = () => within(screen.getByTestId('smart-incentive-switch')).getByRole('switch');
const explainerGone = () => waitFor(() => expect(screen.queryByTestId('smart-incentive-info')).not.toBeInTheDocument());

describe('SmartIncentiveField — the switch and the explainer', () => {
  it('renders the heading, switch, hint and "How it works", with no percentage while off', () => {
    render(<SmartIncentiveField {...props()} />);
    expect(screen.getByTestId('smart-incentive-field')).toBeInTheDocument();
    expect(screen.getByText('Smart Incentive')).toBeInTheDocument();
    expect(screen.getByText('Offer a discount to members who are still deciding')).toBeInTheDocument();
    expect(screen.getByText('Members who stay on your pod page without booking get a one-time offer.')).toBeInTheDocument();
    expect(screen.getByTestId('smart-incentive-learn-more')).toHaveTextContent('How it works');
    expect(switchInput()).not.toBeChecked();
    expect(screen.queryByTestId('smart-incentive-pct')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smart-incentive-price-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smart-incentive-info')).not.toBeInTheDocument();
  });

  it('switching it on reports true and opens the explainer, quoting the delay', () => {
    const onEnabledChange = vi.fn();
    render(<SmartIncentiveField {...props({ onEnabledChange, delaySeconds: 15 })} />);
    fireEvent.click(switchInput());
    expect(onEnabledChange).toHaveBeenCalledTimes(1);
    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('dialog', { name: 'What is Smart Incentive?' })).toBeInTheDocument();
    expect(screen.getByTestId('smart-incentive-info-what')).toHaveTextContent(
      'When a member stays on your pod page for 15 seconds without booking, they see a one-time offer.',
    );
  });

  it('switching it off reports false and opens nothing', () => {
    const onEnabledChange = vi.fn();
    render(<SmartIncentiveField {...props({ enabled: true, pct: '10', onEnabledChange })} />);
    expect(switchInput()).toBeChecked();
    fireEvent.click(switchInput());
    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('smart-incentive-info')).not.toBeInTheDocument();
  });

  it('"How it works" opens the explainer without touching the switch; "Got it" and Escape close it', async () => {
    const onEnabledChange = vi.fn();
    render(<SmartIncentiveField {...props({ onEnabledChange, delaySeconds: 30 })} />);
    fireEvent.click(screen.getByTestId('smart-incentive-learn-more'));
    expect(screen.getByTestId('smart-incentive-info-what')).toHaveTextContent('30 seconds');
    expect(onEnabledChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('smart-incentive-info-close'));
    await explainerGone();
    fireEvent.click(screen.getByTestId('smart-incentive-learn-more'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await explainerGone();
  });
});

describe('SmartIncentiveField — the percentage', () => {
  it('shows the typed percentage within its limits under the max hint, and reports edits and blur', () => {
    const onPctChange = vi.fn();
    const onPctBlur = vi.fn();
    render(<SmartIncentiveField {...props({ enabled: true, pct: '10', onPctChange, onPctBlur })} />);
    const input = screen.getByTestId('smart-incentive-pct');
    expect(screen.getByLabelText('Discount %')).toBe(input);
    expect(input).toHaveValue(10);
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '20');
    expect(input).toHaveAttribute('step', '1');
    expect(screen.getByText('Up to 20% off')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '12' } });
    expect(onPctChange).toHaveBeenCalledWith('12');
    expect(onPctBlur).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onPctBlur).toHaveBeenCalledTimes(1);
  });

  it('shows the form’s message in place of the max hint, and marks the input invalid', () => {
    render(<SmartIncentiveField {...props({ enabled: true, pct: '30', error: 'Discount can’t be more than 20%' })} />);
    expect(screen.getByText('Discount can’t be more than 20%')).toHaveClass('Mui-error');
    expect(screen.queryByText('Up to 20% off')).not.toBeInTheDocument();
    expect(screen.getByTestId('smart-incentive-pct')).toHaveAttribute('aria-invalid', 'true');
  });

  it('previews what one ticket costs with the offer', () => {
    render(<SmartIncentiveField {...props({ enabled: true, pct: '10', unitPrice: 499, formatPrice: rupees })} />);
    expect(screen.getByTestId('smart-incentive-price-preview')).toHaveTextContent('With the offer, a ticket costs ₹449.1');
  });

  it.each([
    ['there is no ticket price', { pct: '10', formatPrice: rupees }],
    ['there is no formatter', { pct: '10', unitPrice: 500 }],
    ['the percentage is blank', { pct: '', unitPrice: 500, formatPrice: rupees }],
    ['the percentage is not whole', { pct: '2.5', unitPrice: 500, formatPrice: rupees }],
    ['the percentage is zero', { pct: '0', unitPrice: 500, formatPrice: rupees }],
  ])('previews no price when %s', (_case, over: Partial<SmartIncentiveFieldProps>) => {
    render(<SmartIncentiveField {...props({ enabled: true, ...over })} />);
    expect(screen.getByTestId('smart-incentive-pct')).toBeInTheDocument();
    expect(screen.queryByTestId('smart-incentive-price-preview')).not.toBeInTheDocument();
  });

  it('locks the switch and the percentage when disabled, leaving the explainer readable', () => {
    render(<SmartIncentiveField {...props({ enabled: true, pct: '10', disabled: true })} />);
    expect(switchInput()).toBeDisabled();
    expect(screen.getByTestId('smart-incentive-pct')).toBeDisabled();
    expect(screen.getByTestId('smart-incentive-learn-more')).toBeEnabled();
  });

  it('follows a host from switching it on to the price their members would pay, and back off', async () => {
    render(<Harness />);
    fireEvent.click(switchInput());
    fireEvent.click(screen.getByTestId('smart-incentive-info-close'));
    await explainerGone();
    fireEvent.change(screen.getByTestId('smart-incentive-pct'), { target: { value: '20' } });
    expect(screen.getByTestId('smart-incentive-price-preview')).toHaveTextContent('With the offer, a ticket costs ₹400');
    fireEvent.click(switchInput());
    expect(switchInput()).not.toBeChecked();
    expect(screen.queryByTestId('smart-incentive-pct')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smart-incentive-info')).not.toBeInTheDocument();
  });
});

describe('SmartIncentiveInfoDialog', () => {
  it('is named by its title and lists the four points in order', () => {
    render(<SmartIncentiveInfoDialog open onClose={vi.fn()} labels={LABELS.info} delaySeconds={45} />);
    const dialog = screen.getByRole('dialog', { name: 'What is Smart Incentive?' });
    const points = within(dialog).getAllByRole('listitem');
    expect(points.map((point) => point.getAttribute('data-testid'))).toEqual(
      ['what', 'who', 'cut', 'change'].map((id) => `smart-incentive-info-${id}`),
    );
    expect(points[0]).toHaveTextContent('for 45 seconds without booking');
    expect(points[1]).toHaveTextContent('Only members who see the offer get the discount.');
    expect(points[2]).toHaveTextContent('The discount comes out of your share.');
    expect(points[3]).toHaveTextContent('You can change the discount or switch it off anytime by editing the pod.');
    expect(within(dialog).getByTestId('smart-incentive-info-close')).toHaveTextContent('Got it');
  });

  it('renders nothing while closed; once open it asks to close from "Got it" and from Escape', () => {
    const onClose = vi.fn();
    const dialog = (open: boolean) => <SmartIncentiveInfoDialog open={open} onClose={onClose} labels={LABELS.info} delaySeconds={15} />;
    const { rerender } = render(dialog(false));
    expect(screen.queryByTestId('smart-incentive-info')).not.toBeInTheDocument();
    rerender(dialog(true));
    fireEvent.click(screen.getByTestId('smart-incentive-info-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
