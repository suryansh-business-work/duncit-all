import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import PodFormActions from '../../src/PodFormActions';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

// The gate reads the same debounced adminPotentialPodEarnings projection the
// earnings panel draws; each test sets what the server has answered.
const apollo = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  options: [] as Array<{ skip?: boolean }>,
}));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { skip?: boolean }) => {
    apollo.options.push(options);
    return { data: apollo.data, loading: apollo.loading, error: apollo.error, refetch: vi.fn() };
  },
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

const answer = (viable: boolean) => ({
  adminPotentialPodEarnings: {
    total_spots: 10,
    payable_spots: 9,
    venue_budget: 650,
    viable,
    viability_reason: viable ? null : 'BELOW_MIN_BUSINESS',
    minimum_viable_ticket_price: 124,
    venue_min_business: viable ? 0 : 1000,
    waterfall: {},
  },
});

afterEach(() => {
  apollo.data = undefined;
  apollo.loading = false;
  apollo.error = undefined;
  apollo.options = [];
});

const ADMIN = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
const paidPod: Partial<PodFormValues> = { pod_type: 'PAID', pod_mode: 'VIRTUAL', pod_amount: 100, no_of_spots: 10 };

function renderActions(data: PodFormData = ADMIN, defaults: Partial<PodFormValues> = paidPod) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <PodFormActions showDraft busy={false} disabled={false} onCancel={vi.fn()} onDraft={vi.fn()} onPublish={vi.fn()} />
    </Harness>,
  );
  return methodsRef;
}

const save = () => screen.getByTestId('pod-form-save');
const draft = () => screen.getByRole('button', { name: 'Save as Draft' });

describe('PodFormActions — Save waits for the earnings verdict on a paid pod', () => {
  it('enables both saves on create once a fresh projection says viable', () => {
    apollo.data = answer(true);
    renderActions();
    expect(save()).toBeEnabled();
    expect(draft()).toBeEnabled();
    expect(save()).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByTestId('pod-form-save-blocked')).not.toBeInTheDocument();
  });

  it('holds both saves on create while the server refuses the pod, and says why Save is off', () => {
    apollo.data = answer(false);
    renderActions();
    expect(save()).toBeDisabled();
    expect(draft()).toBeDisabled();
    const hint = screen.getByTestId('pod-form-save-blocked');
    expect(hint).toHaveTextContent('Save stays off until the earnings projection says this pod works.');
    expect(save()).toHaveAttribute('aria-describedby', hint.id);
  });

  it('holds Save while the projection is loading, and when it failed', () => {
    apollo.loading = true;
    const { unmount } = render(
      <Harness data={ADMIN} defaultValues={paidPod}>
        <PodFormActions showDraft={false} busy={false} disabled={false} onCancel={vi.fn()} onDraft={vi.fn()} onPublish={vi.fn()} />
      </Harness>,
    );
    expect(save()).toBeDisabled();
    unmount();
    apollo.loading = false;
    apollo.error = new Error('Network request failed');
    renderActions();
    expect(save()).toBeDisabled();
  });

  it('holds Save the moment the price changes, before the new projection is in', () => {
    apollo.data = answer(true);
    const form = renderActions();
    expect(save()).toBeEnabled();
    act(() => {
      form.current?.setValue('pod_amount', 90);
    });
    expect(save()).toBeDisabled();
  });

  it('never holds a free pod, nor a paid one with no price yet (the form asks for it)', () => {
    apollo.data = answer(false);
    renderActions(ADMIN, { ...paidPod, pod_type: 'FREE', pod_amount: 0 });
    expect(save()).toBeEnabled();
    expect(apollo.options.every((options) => options.skip === true)).toBe(true);
  });

  it('never holds a paid pod whose price box is still empty', () => {
    apollo.data = answer(false);
    renderActions(ADMIN, { ...paidPod, pod_amount: 0 });
    expect(save()).toBeEnabled();
  });

  it.each([
    ['a form that draws no projection (Club Admin, Partners)', makeData({ config: makeConfig(), finance: FINANCE })],
    ['an Auto Pod template', makeData({ config: makeConfig({ showFinance: true, autoPod: true }), finance: FINANCE })],
    ['a form still waiting on the finance settings', makeData({ config: makeConfig({ showFinance: true }) })],
  ])('never holds %s — and never asks the admin-only projection', (_label, data) => {
    apollo.data = answer(false);
    renderActions(data);
    expect(save()).toBeEnabled();
    expect(apollo.options.every((options) => options.skip === true)).toBe(true);
  });

  it('lets an edit that leaves the money alone through, even on a pod the server would refuse today', () => {
    apollo.data = answer(false);
    renderActions({ ...ADMIN, editingPodDocId: 'doc-1' });
    expect(save()).toBeEnabled();
  });

  it('reads an edit from its loaded pod id too', () => {
    apollo.data = answer(false);
    renderActions(ADMIN, { ...paidPod, pod_id: 'POD-1' });
    expect(save()).toBeEnabled();
  });

  it('holds an edit as soon as it changes the money', () => {
    apollo.data = answer(false);
    const form = renderActions({ ...ADMIN, editingPodDocId: 'doc-1' });
    act(() => {
      form.current?.setValue('no_of_spots', 12);
    });
    expect(save()).toBeDisabled();
  });

  it('never holds a completed or cancelled pod, whatever the edit changes', () => {
    apollo.data = answer(false);
    const form = renderActions({ ...ADMIN, editingPodDocId: 'doc-1', podClosed: true });
    act(() => {
      form.current?.setValue('pod_amount', 90);
    });
    expect(save()).toBeEnabled();
  });
});
