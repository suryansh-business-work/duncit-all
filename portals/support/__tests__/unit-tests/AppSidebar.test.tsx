import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AppSidebar from '../../src/components/AppSidebar';
import { renderWithProviders } from './testkit';

const selectedLabel = () => document.querySelector('.Mui-selected')?.textContent ?? '';

describe('AppSidebar', () => {
  it('shows a skeleton while branding loads, then the logo', async () => {
    const { container } = renderWithProviders(<AppSidebar />, { initialEntries: ['/'] });
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText('Duncit')).toBeInTheDocument());
  });

  it('marks the dashboard active on the root route', () => {
    renderWithProviders(<AppSidebar />, { initialEntries: ['/'] });
    expect(selectedLabel()).toBe('Dashboard');
  });

  it('marks a top-level section active', () => {
    renderWithProviders(<AppSidebar />, { initialEntries: ['/sos'] });
    expect(selectedLabel()).toBe('SOS Alerts');
  });

  it('keeps the section active on a detail route (prefix match)', () => {
    renderWithProviders(<AppSidebar />, { initialEntries: ['/tickets/abc123'] });
    expect(selectedLabel()).toBe('Tickets');
  });

  it('does not mark the dashboard active on a non-root route', () => {
    renderWithProviders(<AppSidebar />, { initialEntries: ['/feedback'] });
    expect(selectedLabel()).toBe('Live Feedback');
  });

  it('invokes onNavigate when a link is clicked', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<AppSidebar onNavigate={onNavigate} />, { initialEntries: ['/'] });
    fireEvent.click(screen.getByText('Tickets'));
    expect(onNavigate).toHaveBeenCalled();
  });
});
