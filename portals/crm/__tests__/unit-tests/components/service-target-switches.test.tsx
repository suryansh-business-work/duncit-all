import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ServiceTargetSwitches from '@/pages/data/services-offered/ServiceTargetSwitches';
import type { ServiceTargets } from '@/config/serviceTargets';

const noneOn: ServiceTargets = {
  applies_to_venue: false,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
};
const allOn: ServiceTargets = {
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: true,
  applies_to_creator: true,
  applies_to_community: true,
};

const renderSwitches = (value: ServiceTargets) => {
  const onChange = vi.fn<(next: ServiceTargets) => void>();
  render(<ServiceTargetSwitches value={value} onChange={onChange} />);
  return onChange;
};

const toggle = (name: string) => screen.getByRole('switch', { name });

describe('ServiceTargetSwitches', () => {
  it('shows one switch per lead kind plus "All lead types", reflecting the value', () => {
    renderSwitches({ ...noneOn, applies_to_venue: true, applies_to_creator: true });

    expect(screen.getByText('AVAILABLE FOR · lead forms that show this service')).toBeInTheDocument();
    expect(screen.getAllByRole('switch').map((s) => s.closest('label')?.textContent)).toEqual([
      'Venue',
      'Host',
      'Ecomm',
      'Creator',
      'Community',
      'All lead types',
    ]);
    expect(toggle('Venue')).toBeChecked();
    expect(toggle('Host')).not.toBeChecked();
    expect(toggle('Creator')).toBeChecked();
    expect(toggle('All lead types')).not.toBeChecked();
    expect(screen.queryByText('Turn on at least one lead type.')).toBeNull();
  });

  it('turns one kind on without touching the others', () => {
    const onChange = renderSwitches({ ...noneOn, applies_to_venue: true });
    fireEvent.click(toggle('Community'));
    expect(onChange).toHaveBeenCalledWith({ ...noneOn, applies_to_venue: true, applies_to_community: true });
  });

  it('turns one kind off without touching the others', () => {
    const onChange = renderSwitches(allOn);
    fireEvent.click(toggle('Ecomm'));
    expect(onChange).toHaveBeenCalledWith({ ...allOn, applies_to_ecomm: false });
  });

  it('checks "All lead types" only when every kind is on, and turning it off clears them all', () => {
    const onChange = renderSwitches(allOn);
    expect(toggle('All lead types')).toBeChecked();
    fireEvent.click(toggle('All lead types'));
    expect(onChange).toHaveBeenCalledWith(noneOn);
  });

  it('turns every kind on from "All lead types"', () => {
    const onChange = renderSwitches({ ...noneOn, applies_to_host: true });
    fireEvent.click(toggle('All lead types'));
    expect(onChange).toHaveBeenCalledWith(allOn);
  });

  it('warns when no lead type is on', () => {
    renderSwitches(noneOn);
    expect(screen.getByText('Turn on at least one lead type.')).toBeInTheDocument();
    expect(toggle('All lead types')).not.toBeChecked();
  });
});
