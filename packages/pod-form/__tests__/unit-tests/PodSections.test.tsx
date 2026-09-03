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
}));
vi.mock('@apollo/client/react', () => ({
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

  // The "Attach products" switch is gone: attaching a product IS enabling them,
  // so the section opens like any other and the flag is derived at build time.
  it('opens the products section like any other, with no enable switch', async () => {
    const user = userEvent.setup();
    const ref = renderSections(makeData({ config: makeConfig({ showProducts: true }) }));
    const productsHeader = screen.getByRole('button', { name: /6. Approved Products/ });
    expect(productsHeader).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    await user.click(productsHeader);
    expect(productsHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Add a Product' })).toBeInTheDocument();
    expect(ref.current?.getValues('products_enabled')).toBe(false);
  });

  it('leaves the products section out when the config hides products', () => {
    renderSections(makeData());
    expect(screen.queryByText(/Approved Products/)).not.toBeInTheDocument();
    expect(screen.getByText('6. Payment & Charges')).toBeInTheDocument();
  });

  it('omits the products section for a virtual pod even when enabled in config', () => {
    renderSections(makeData({ config: makeConfig({ showProducts: true }) }), { pod_mode: 'VIRTUAL' });
    expect(screen.queryByText(/Approved Products/)).not.toBeInTheDocument();
  });
});

describe('PodSections (autoPod)', () => {
  it('drops Payment & Charges and the venue section, keeping the pod copy sections', () => {
    renderSections(makeData({ config: makeConfig({ autoPod: true }) }), { pod_type: 'PAID' });
    expect(screen.getByText('1. Basic Information')).toBeInTheDocument();
    expect(screen.getByText('2. About this Pod')).toBeInTheDocument();
    expect(screen.queryByText(/Payment & Charges/)).not.toBeInTheDocument();
    expect(screen.queryByText(/When, Where/)).not.toBeInTheDocument();
  });

  // A virtual template has no Meeting Details either: the host writes the link
  // and the window into their own claim, because no venue will bring them.
  it('gives a virtual template no Meeting Details and no products', () => {
    renderSections(makeData({ config: makeConfig({ autoPod: true, showProducts: true }) }), {
      pod_type: 'PAID',
      pod_mode: 'VIRTUAL',
    });
    expect(screen.queryByText(/Meeting Details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approved Products/)).not.toBeInTheDocument();
    expect(screen.getByText('2. About this Pod')).toBeInTheDocument();
  });

  it('offers Approved Products to a physical template when the surface shows them', () => {
    renderSections(makeData({ config: makeConfig({ autoPod: true, showProducts: true }) }), { pod_type: 'PAID' });
    expect(screen.getByText('4. Approved Products')).toBeInTheDocument();
    expect(screen.queryByText(/Payment & Charges/)).not.toBeInTheDocument();
  });
});
