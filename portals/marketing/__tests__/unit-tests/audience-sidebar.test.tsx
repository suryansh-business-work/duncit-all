import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  FilterSidebar,
  EMPTY_FILTERS,
  type AudienceFilterState,
} from '../../src/pages/target-audience-page/audience-filters';

const OPTIONS = {
  roles: [{ value: 'HOST', label: 'HOST' }],
  interests: [{ value: 'c1', label: 'Live Music' }],
  country: [{ value: 'India', label: 'India' }],
  state: [{ value: 'Maharashtra', label: 'Maharashtra' }],
  city: [{ value: 'Pune', label: 'Pune' }],
  zone: [{ value: 'Kothrud', label: 'Kothrud' }],
};

const renderSidebar = (state: AudienceFilterState = EMPTY_FILTERS) => {
  const onChange = vi.fn();
  render(<FilterSidebar state={state} onChange={onChange} options={OPTIONS} />);
  return onChange;
};

/** Open every accordion — only the first is expanded by default. */
const expandAll = () => {
  for (const title of ['Location', 'Reachability', 'Account', 'Activity']) {
    fireEvent.click(screen.getByText(title));
  }
};

const labelledSelect = (label: string) => screen.getByLabelText(label);

describe('FilterSidebar', () => {
  it('shows every filter group', () => {
    renderSidebar();
    for (const title of ['People', 'Location', 'Reachability', 'Account', 'Activity']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('counts the active filters and resets them', () => {
    const onChange = renderSidebar({ ...EMPTY_FILTERS, city: ['Pune'], ageMin: '25' });
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('disables Reset when nothing is filtered', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('emits a number-range edit', () => {
    const onChange = renderSidebar();
    fireEvent.change(labelledSelect('Age from'), { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, ageMin: '25' });

    fireEvent.change(labelledSelect('Age to'), { target: { value: '34' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, ageMax: '34' });
  });

  it('emits a free-text edit', () => {
    const onChange = renderSidebar();
    fireEvent.change(labelledSelect('Language'), { target: { value: 'en-IN' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, locale: 'en-IN' });
  });

  it('emits a date-range edit', () => {
    const onChange = renderSidebar();
    expandAll();
    fireEvent.change(labelledSelect('Joined from'), { target: { value: '2026-01-01' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, joinedFrom: '2026-01-01' });

    fireEvent.change(labelledSelect('Last active to'), { target: { value: '2026-02-01' } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, activeTo: '2026-02-01' });
  });

  it('emits a multi-select pick and shows it as a chip', () => {
    const onChange = renderSidebar();
    expandAll();
    fireEvent.mouseDown(screen.getByLabelText('City'));
    fireEvent.click(screen.getByRole('option', { name: 'Pune' }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, city: ['Pune'] });
  });

  it('renders the chips for an already-selected multi-select', () => {
    renderSidebar({ ...EMPTY_FILTERS, city: ['Pune'] });
    fireEvent.click(screen.getByText('Location'));
    expect(screen.getByText('Pune')).toBeInTheDocument();
  });

  it('says so when a dropdown has no options yet', () => {
    const onChange = vi.fn();
    render(
      <FilterSidebar
        state={EMPTY_FILTERS}
        onChange={onChange}
        options={{ ...OPTIONS, roles: [], interests: [] }}
      />,
    );
    fireEvent.click(screen.getByText('Account'));
    fireEvent.mouseDown(screen.getByLabelText('Roles'));
    expect(screen.getByText('No options yet')).toBeInTheDocument();
  });

  it('emits a single-select pick', () => {
    const onChange = renderSidebar();
    expandAll();
    fireEvent.mouseDown(screen.getByLabelText('Push reachable'));
    fireEvent.click(screen.getByRole('option', { name: 'Android' }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, push: 'ANDROID' });
  });

  it('emits both sides of a yes/no filter', () => {
    const onChange = renderSidebar();
    expandAll();
    fireEvent.mouseDown(screen.getByLabelText('WhatsApp verified'));
    fireEvent.click(screen.getByRole('option', { name: 'Yes' }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, whatsapp: 'yes' });
  });

  it('clears a single select back to Any', () => {
    const onChange = renderSidebar({ ...EMPTY_FILTERS, status: 'ACTIVE' });
    expandAll();
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(screen.getByRole('option', { name: 'Any' }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, status: '' });
  });
});
