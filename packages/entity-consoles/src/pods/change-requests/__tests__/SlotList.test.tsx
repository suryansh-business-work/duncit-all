import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import SlotList from '../SlotList';
import { makeSlot } from './fixtures';

describe('SlotList', () => {
  it('shows two placeholders and no slots while the slots load', () => {
    const { container } = renderWithProviders(
      <SlotList rows={[makeSlot()]} loading busy={false} onPick={vi.fn()} />,
    );
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Send request' })).not.toBeInTheDocument();
  });

  it('tells the admin to pick another venue when this one has no free slot', () => {
    renderWithProviders(<SlotList rows={[]} loading={false} busy={false} onPick={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This venue has no free slots. Pick a different venue.');
  });

  it('lists each slot with its space, price and capacity, and sends the one picked', () => {
    const onPick = vi.fn();
    const slot = makeSlot();
    renderWithProviders(<SlotList rows={[slot]} loading={false} busy={false} onPick={onPick} />);

    expect(screen.getByText('Upper deck · Price: 2500 · Capacity: 24')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(onPick).toHaveBeenCalledWith(slot);
  });

  it('leaves out a blank space label, and disables the picks while an offer is sent', () => {
    renderWithProviders(
      <SlotList rows={[makeSlot({ space_label: '', price: 1800, capacity: 12 })]} loading={false} busy onPick={vi.fn()} />,
    );
    expect(screen.getByText('Price: 1800 · Capacity: 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  });
});
