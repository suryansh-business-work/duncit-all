import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import VenuePicker from './VenuePicker';
import { renderWithProviders } from '../../__tests__/render';
import { myVenue } from '../../__tests__/venue-fixtures';

afterEach(cleanup);

describe('VenuePicker', () => {
  it('lists each venue with its city and status, and a venue with neither by its name alone', () => {
    const bare = { ...myVenue('v2', 'Garden'), city: '', status: '' };
    renderWithProviders(<VenuePicker venues={[myVenue('v1', 'Rooftop'), bare]} value={null} onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Rooftop · Pune · APPROVED' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Garden' })).toBeTruthy();
  });

  it('starts empty with no value and reports the venue picked', () => {
    const onChange = vi.fn();
    renderWithProviders(<VenuePicker venues={[myVenue('v1', 'Rooftop')]} value={null} onChange={onChange} />);
    expect(screen.getByRole('combobox').textContent).not.toContain('Rooftop');
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Rooftop/ }));
    expect(onChange).toHaveBeenCalledWith('v1');
  });
});
