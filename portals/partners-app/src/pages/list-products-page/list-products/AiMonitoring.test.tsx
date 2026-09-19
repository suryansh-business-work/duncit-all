import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AiCheckingIndicator, AiMonitoringChip } from './AiMonitoring';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

describe('AiMonitoringChip', () => {
  it('explains what the AI preflight scans when the pill is pressed', async () => {
    renderWithProviders(<AiMonitoringChip />);

    const pill = screen.getByTestId('ai-monitoring-chip');
    expect(pill.textContent).toContain('AI monitoring');
    expect(pill.getAttribute('aria-label')).toBe('AI content check');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(pill);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('AI content check')).toBeTruthy();
    expect(within(dialog).getByText(/Every listing runs through an AI check before it is submitted/)).toBeTruthy();
    for (const [label, detail] of [
      ['Product title', 'checked for misleading, offensive or restricted wording.'],
      ['Variant descriptions', 'checked against the community guidelines.'],
      ['Variant images', 'scanned for prohibited or unsafe content.'],
    ]) {
      expect(within(dialog).getByText(label)).toBeTruthy();
      expect(within(dialog).getByText(detail)).toBeTruthy();
    }
    expect(within(dialog).getByText(/nothing is submitted until the listing passes/)).toBeTruthy();
  });

  it('closes from Got it', async () => {
    renderWithProviders(<AiMonitoringChip />);
    fireEvent.click(screen.getByTestId('ai-monitoring-chip'));

    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes on Escape', async () => {
    renderWithProviders(<AiMonitoringChip />);
    fireEvent.click(screen.getByTestId('ai-monitoring-chip'));

    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('AiCheckingIndicator', () => {
  it('announces the check while it runs', () => {
    renderWithProviders(<AiCheckingIndicator visible />);
    const indicator = screen.getByTestId('ai-checking-indicator');
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.textContent).toContain('AI is checking all your details…');
  });

  it('renders nothing while no check runs', () => {
    renderWithProviders(<AiCheckingIndicator visible={false} />);
    expect(screen.queryByTestId('ai-checking-indicator')).toBeNull();
  });
});
