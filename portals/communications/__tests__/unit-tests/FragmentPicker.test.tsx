import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FragmentPicker from '../../src/pages/email-templates-page/FragmentPicker';

const options = [
  { key: 'transactional', name: 'Transactional', is_active: true },
  { key: 'weekend-banner', name: 'Weekend Banner', is_active: false },
];

const open = () => fireEvent.mouseDown(screen.getByRole('combobox'));

describe('FragmentPicker', () => {
  it('lets a fragment be picked, and cleared back to None', () => {
    const onChange = vi.fn();
    render(<FragmentPicker value={null} options={options} onChange={onChange} />);

    open();
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Transactional'));
    expect(onChange).toHaveBeenCalledWith('transactional');

    // An empty selection is null, not '' — the server stores "no fragment".
    onChange.mockClear();
    render(<FragmentPicker value="transactional" options={options} onChange={onChange} />);
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('None'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('marks a switched-off fragment and says what picking it means', () => {
    render(<FragmentPicker value="weekend-banner" options={options} onChange={vi.fn()} />);
    expect(screen.getByText(/switched off/)).toBeInTheDocument();
  });

  it('says the list FAILED rather than showing it as empty', () => {
    render(<FragmentPicker value={null} options={[]} error="Network error" onChange={vi.fn()} />);
    expect(screen.getByText(/Could not load fragments: Network error/)).toBeInTheDocument();
  });

  it('distinguishes still-loading from genuinely none', () => {
    const { unmount } = render(
      <FragmentPicker value={null} options={[]} loading onChange={vi.fn()} />
    );
    expect(screen.getByText(/Loading fragments/)).toBeInTheDocument();
    unmount();

    render(<FragmentPicker value={null} options={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/No fragments yet/)).toBeInTheDocument();
  });
});
