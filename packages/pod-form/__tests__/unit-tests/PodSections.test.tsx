import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import PodSections from '../../src/PodSections';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: any) => <span>picker:{label}</span>,
}));

const useQueryMock = vi.fn().mockReturnValue({
  data: { venueAvailableSlots: [] },
  loading: false,
  error: undefined,
});
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

function renderSections(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <PodSections />
    </Harness>,
  );
  return methodsRef;
}

describe('PodSections', () => {
  it('numbers the physical sections and shows the When/Where section', () => {
    renderSections(makeData());
    expect(screen.getByText('1. Basic Information')).toBeInTheDocument();
    expect(screen.getByText('2. When, Where & Map')).toBeInTheDocument();
    expect(screen.getByText('3. About this Pod')).toBeInTheDocument();
  });

  it('shows the Meeting section for a virtual pod', () => {
    renderSections(makeData(), { pod_mode: 'VIRTUAL' });
    expect(screen.getByText('2. Meeting Details')).toBeInTheDocument();
    expect(screen.queryByText(/When, Where/)).not.toBeInTheDocument();
  });

  it('renders the reel field when the config enables it', () => {
    renderSections(makeData({ config: makeConfig({ showReel: true }) }));
    expect(screen.getByText('Pod Reel')).toBeInTheDocument();
  });

  it('omits the reel field when disabled', () => {
    renderSections(makeData());
    expect(screen.queryByText('Pod Reel')).not.toBeInTheDocument();
  });

  it('surfaces media and reel validation errors', async () => {
    const ref = renderSections(makeData({ config: makeConfig({ showReel: true }) }));
    await act(async () => {
      ref.current?.setError('media_text', { type: 'custom', message: 'At least one image is required' });
      ref.current?.setError('reel_url', { type: 'custom', message: 'Reel video must be a valid http(s) URL' });
    });
    expect(screen.getByText('At least one image is required')).toBeInTheDocument();
    expect(screen.getAllByText('Reel video must be a valid http(s) URL').length).toBeGreaterThanOrEqual(1);
  });

  it('expands and collapses all sections', async () => {
    const user = userEvent.setup();
    renderSections(makeData());
    const expandAll = screen.getByRole('button', { name: 'Expand all sections' });
    const collapseAll = screen.getByRole('button', { name: 'Collapse all sections' });
    await user.click(expandAll);
    expect(expandAll).toBeDisabled();
    await user.click(collapseAll);
    expect(collapseAll).toBeDisabled();
  });

  it('toggles a single section open and closed', async () => {
    const user = userEvent.setup();
    renderSections(makeData());
    const about = screen.getByRole('button', { name: /3. About this Pod/ });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    await user.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'true');
    await user.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'false');
  });

  it('enables the products section only via its switch', async () => {
    const user = userEvent.setup();
    const ref = renderSections(makeData({ config: makeConfig({ showProducts: true }) }));
    // products accordion is present but disabled until the switch is on
    const productsHeader = screen.getByRole('button', { name: /Approved Products/ });
    await user.click(productsHeader);
    expect(ref.current?.getValues('products_enabled')).toBe(false);
    // flip the enable switch
    await user.click(screen.getByRole('checkbox'));
    expect(ref.current?.getValues('products_enabled')).toBe(true);
    expect(productsHeader).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits the products section for a virtual pod even when enabled in config', () => {
    renderSections(makeData({ config: makeConfig({ showProducts: true }) }), { pod_mode: 'VIRTUAL' });
    expect(screen.queryByText(/Approved Products/)).not.toBeInTheDocument();
  });
});
