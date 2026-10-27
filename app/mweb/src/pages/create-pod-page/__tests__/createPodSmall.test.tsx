import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { z } from 'zod';

import HostAgainNotice from '../HostAgainNotice';
import { useCreatePodPublish } from '../useCreatePodPublish';
import { useHostAgainPrefill } from '../useHostAgainPrefill';
import { createPodSeed } from '../createPodSeed';
import { hydrateDraft, serializeDraft } from '../create-pod/create-pod.draft';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { stepForField, stepSubtitleKey, stepTitleKey } from '../create-pod/create-pod.steps';
import { refineTicketDiscount } from '../create-pod/create-pod.ticket-discount';
import { refinePublish } from '../create-pod/create-pod.refine';
import { toTierFieldErrors } from '../create-pod/fields/tier-errors';
import { offerOfForm, useOfferQuote } from '../create-pod/useOfferQuote';
import ChipArrayField from '../create-pod/fields/ChipArrayField';
import HashtagChipsField, { parseHashtags } from '../create-pod/fields/HashtagChipsField';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  publish: vi.fn(),
  clientQuery: vi.fn(),
  warn: vi.fn(),
  prefill: { data: undefined as unknown, loading: false, error: undefined as unknown },
  prefillOpts: undefined as unknown,
  quote: { data: undefined as unknown, loading: false, error: undefined as unknown },
  quoteOpts: undefined as undefined | { skip: boolean; variables: { venue_id: string; offer: unknown } },
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: () => [h.publish, { loading: false }],
  useApolloClient: () => ({ query: h.clientQuery }),
  useQuery: (doc: { definitions?: Array<{ name?: { value: string } }> }, opts: unknown) => {
    const name = doc.definitions?.[0]?.name?.value ?? '';
    if (name === 'CreatePodHostAgainPrefill') {
      h.prefillOpts = opts;
      return h.prefill;
    }
    h.quoteOpts = opts as typeof h.quoteOpts;
    return h.quote;
  },
}));
vi.mock('@duncit/logs', async (orig) => {
  const real = await orig<typeof import('@duncit/logs')>();
  return { ...real, logs: { ...real.logs, mWeb: { ...real.logs.mWeb, warn: h.warn } } };
});

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: ReactNode, entry = '/') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.prefill = { data: undefined, loading: false, error: undefined };
  h.quote = { data: undefined, loading: false, error: undefined };
});
afterEach(() => vi.useRealTimers());

describe('HostAgainNotice', () => {
  const prefill = (notices: string[]) => ({ source_pod_id: 'p1', source_title: 'Sunday Run', payload: '{}', step: 0, notices });

  it('says where the form was copied from, with no city line and no warnings', () => {
    render(<HostAgainNotice prefill={prefill([])} otherCityName={null} />);
    expect(screen.getByTestId('create-pod-host-again-source')).toHaveTextContent('Sunday Run');
    expect(screen.queryByTestId('create-pod-host-again-city')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-host-again-warnings')).not.toBeInTheDocument();
  });

  it('names a pod city other than the header city and lists what could not be carried over, skipping unknown codes', () => {
    render(<HostAgainNotice prefill={prefill(['CLUB_UNAVAILABLE', 'FUTURE_CODE', 'VENUE_UNAVAILABLE'])} otherCityName="Pune" />);
    expect(screen.getByTestId('create-pod-host-again-city')).toHaveTextContent('Pune');
    const items = screen.getByTestId('create-pod-host-again-warnings').querySelectorAll('li');
    expect([...items].map((li) => li.textContent)).toEqual([
      fallbackT('mweb.createPod.hostAgain.clubUnavailable'),
      fallbackT('mweb.createPod.hostAgain.venueUnavailable'),
    ]);
  });

  it('shows no warning block when the server only sent codes this build does not know', () => {
    render(<HostAgainNotice prefill={prefill(['FUTURE_CODE'])} otherCityName={null} />);
    expect(screen.queryByTestId('create-pod-host-again-warnings')).not.toBeInTheDocument();
  });
});

describe('useCreatePodPublish', () => {
  const publishWith = async (created: unknown, challenge: object | Error = { required: false }) => {
    h.publish.mockResolvedValue({ data: { publishPodDraft: created } });
    if (challenge instanceof Error) h.clientQuery.mockRejectedValue(challenge);
    else h.clientQuery.mockResolvedValue({ data: { podChallengeSetup: challenge } });
    function Probe() {
      const run = useCreatePodPublish();
      return <button data-testid="go" onClick={() => run('draft1', { a: 1 }).catch((e) => document.body.setAttribute('data-error', String(e.message)))} />;
    }
    inRouter(<Probe />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('go'));
    });
  };

  it('sends a pod that is still waiting on a venue to the pending page', async () => {
    await publishWith({ id: 'pod1', venue_approval_status: 'PENDING' });
    expect(h.publish).toHaveBeenCalledWith({ variables: { draft_id: 'draft1', input: { a: 1 } } });
    expect(screen.getByTestId('where')).toHaveTextContent('/host/pod-pending/pod1');
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it('sends the host to Host Management once the pod is live and needs no challenge', async () => {
    await publishWith({ id: 'pod2', venue_approval_status: 'APPROVED' });
    expect(screen.getByTestId('where')).toHaveTextContent('/host/manage');
  });

  it('takes the host to set up the challenge when the pod category requires one', async () => {
    await publishWith({ id: 'pod5', venue_approval_status: 'APPROVED' }, { enabled: true, require_challenge: true, templates: [{ id: 't1' }] });
    expect(screen.getByTestId('where')).toHaveTextContent('/host/pod/pod5/challenges');
  });

  it('keeps the host on Host Management when challenges are optional or have no template', async () => {
    await publishWith({ id: 'pod6', venue_approval_status: 'APPROVED' }, { enabled: true, require_challenge: true, templates: [] });
    expect(screen.getByTestId('where')).toHaveTextContent('/host/manage');
  });

  it('fails the publish when the server returns no pod', async () => {
    await publishWith(null);
    expect(document.body.getAttribute('data-error')).toBe(fallbackT('mweb.createPod.createFailed'));
    document.body.removeAttribute('data-error');
  });

  it('never blocks a publish when the challenge setup cannot be read, and logs it', async () => {
    await publishWith({ id: 'pod3', venue_approval_status: 'APPROVED' }, new Error('offline'));
    expect(h.warn).toHaveBeenCalledWith('create-pod', 'challengeSetup', expect.objectContaining({ error: expect.any(Error) }));
    expect(screen.getByTestId('where')).toHaveTextContent('/host/manage');
  });

  it('treats a missing setup answer as no challenge required', async () => {
    h.publish.mockResolvedValue({ data: { publishPodDraft: { id: 'pod4', venue_approval_status: 'APPROVED' } } });
    h.clientQuery.mockResolvedValue({ data: undefined });
    function Probe() {
      const run = useCreatePodPublish();
      return <button data-testid="go" onClick={() => void run('d', {})} />;
    }
    inRouter(<Probe />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('go'));
    });
    expect(screen.getByTestId('where')).toHaveTextContent('/host/manage');
  });
});

describe('useHostAgainPrefill', () => {
  const run = (enabled: boolean, entry: string) =>
    renderHook(() => useHostAgainPrefill(enabled), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/create-pod" element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      ),
    });

  it('asks for nothing without the parameter or when disabled', () => {
    expect(run(true, '/create-pod').result.current).toEqual({ prefill: null, loading: false, failed: false });
    expect((h.prefillOpts as { skip: boolean }).skip).toBe(true);
    run(false, '/create-pod?host_again=P1');
    expect((h.prefillOpts as { skip: boolean }).skip).toBe(true);
  });

  it('reads the earlier pod and hands back its prefill', () => {
    h.prefill = { data: { hostAgainPrefill: { source_title: 'Run' } }, loading: false, error: undefined };
    const { result } = run(true, '/create-pod?host_again=P1');
    expect((h.prefillOpts as { skip: boolean; variables: { pod_doc_id: string } }).variables.pod_doc_id).toBe('P1');
    expect(result.current.prefill).toEqual({ source_title: 'Run' });
    expect(result.current.loading).toBe(false);
  });

  it('is loading until the first answer, then not while a refresh runs', () => {
    h.prefill = { data: undefined, loading: true, error: undefined };
    expect(run(true, '/create-pod?host_again=P1').result.current.loading).toBe(true);
    h.prefill = { data: { hostAgainPrefill: { source_title: 'Run' } }, loading: true, error: undefined };
    expect(run(true, '/create-pod?host_again=P1').result.current.loading).toBe(false);
  });

  it('reports a failed read, and an empty answer as no prefill', () => {
    h.prefill = { data: undefined, loading: false, error: new Error('x') };
    expect(run(true, '/create-pod?host_again=P1').result.current).toEqual({ prefill: null, loading: false, failed: true });
    h.prefill = { data: {}, loading: false, error: undefined };
    expect(run(true, '/create-pod?host_again=P1').result.current.prefill).toBeNull();
  });
});

describe('createPodSeed and the draft', () => {
  const payload = (over: Partial<CreatePodFormValues> = {}) => JSON.stringify({ ...blankCreatePodForm, pod_title: 'T', ...over });

  it('opens a fresh pod in the header city with a request prefill over it', () => {
    const seed = createPodSeed(null, { location_id: 'loc1', venue_id: 'v1' });
    expect(seed.step).toBe(0);
    expect(seed.values.location_id).toBe('loc1');
    expect(seed.values.venue_id).toBe('v1');
  });

  it('resumes a stored form on its step, clamped into the stepper, and keeps its own city', () => {
    const seed = createPodSeed({ payload: payload({ location_id: 'own' }), step: 99 }, { location_id: 'header' });
    expect(seed.values.location_id).toBe('own');
    expect(seed.step).toBe(3);
    expect(createPodSeed({ payload: payload({ location_id: 'own' }), step: -4 }, {}).step).toBe(0);
    expect(createPodSeed({ payload: payload({ location_id: 'own' }) }, {}).step).toBe(0);
    expect(createPodSeed({ payload: payload({ location_id: 'own' }), step: null }, {}).step).toBe(0);
  });

  it('opens a stored form whose city is gone in the header city, or blank when there is none', () => {
    expect(createPodSeed({ payload: payload({ location_id: '' }), step: 1 }, { location_id: 'header' }).values.location_id).toBe('header');
    expect(createPodSeed({ payload: payload({ location_id: '' }), step: 1 }, {}).values.location_id).toBe('');
  });

  it('revives dates, normalises retired pod types and survives a broken payload', () => {
    const start = new Date('2026-07-01T10:00:00.000Z');
    const hydrated = hydrateDraft(payload({ pod_date_time: start as never, pod_end_date_time: null }));
    expect(hydrated.pod_date_time?.getTime()).toBe(start.getTime());
    expect(hydrated.pod_end_date_time).toBeNull();
    expect(hydrateDraft(payload({ pod_type: 'NATIVE_FREE' as never })).pod_type).toBe('FREE');
    expect(hydrateDraft(payload({ pod_type: 'NATIVE_PAID' as never })).pod_type).toBe('PAID');
    expect(hydrateDraft(JSON.stringify({ pod_title: 'x' })).pod_type).toBe(blankCreatePodForm.pod_type);
    expect(hydrateDraft('not json')).toEqual(blankCreatePodForm);
    expect(hydrateDraft(payload({ pod_end_date_time: new Date('2026-07-01T12:00:00.000Z') as never })).pod_end_date_time?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });

  it('serialises the draft with the trimmed title and the step', () => {
    const out = serializeDraft({ ...blankCreatePodForm, pod_title: '  Run  ' }, 2);
    expect(out).toMatchObject({ pod_title: 'Run', step: 2, pod_mode: 'PHYSICAL' });
    expect(JSON.parse(out.payload).pod_title).toBe('  Run  ');
  });
});

describe('stepper step helpers', () => {
  it('names the venue step differently for a virtual pod, and only that step', () => {
    expect(stepTitleKey(2, 'VIRTUAL')).toBe('mweb.createPod.step3TitleVirtual');
    expect(stepSubtitleKey(2, 'VIRTUAL')).toBe('mweb.createPod.step3SubtitleVirtual');
    expect(stepTitleKey(2, 'PHYSICAL')).toBe('mweb.createPod.step3Title');
    expect(stepSubtitleKey(2)).toBe('mweb.createPod.step3Subtitle');
    expect(stepTitleKey(1, 'VIRTUAL')).toBe('mweb.createPod.step1Title');
    expect(stepSubtitleKey(3, 'VIRTUAL')).toBe('mweb.createPod.step4Subtitle');
  });

  it('places a field on its step, and an unknown field on the first step', () => {
    expect(stepForField('club_id')).toBe(0);
    expect(stepForField('pod_title')).toBe(1);
    expect(stepForField('pod_date_time')).toBe(2);
    expect(stepForField('agreed_to_terms')).toBe(3);
    expect(stepForField('nope' as never)).toBe(0);
  });
});

describe('ticket discount and publish refinements', () => {
  const run = (values: Partial<CreatePodFormValues>, maxPct = 50) => {
    const issues: Array<{ path: unknown[]; message: string }> = [];
    const ctx = { addIssue: (issue: { path: unknown[]; message: string }) => issues.push(issue) } as unknown as z.RefinementCtx;
    refineTicketDiscount({ ...blankCreatePodForm, ...values }, ctx, fallbackT, maxPct);
    return issues;
  };

  it('does not check a free pod, nor a paid pod whose tiers are fine or switched off', () => {
    expect(run({ pod_type: 'FREE', ticket_discount_enabled: true, ticket_discount_tiers: [] })).toEqual([]);
    expect(run({ pod_type: 'PAID', ticket_discount_enabled: false })).toEqual([]);
    expect(run({ pod_type: 'PAID', no_of_spots: 10, ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }] })).toEqual([]);
  });

  it('places a list-level problem on the list and a row problem on its row', () => {
    const none = run({ pod_type: 'PAID', no_of_spots: 10, ticket_discount_enabled: true, ticket_discount_tiers: [] });
    expect(none.length).toBeGreaterThan(0);
    expect(none[0].path).toEqual(['ticket_discount_tiers']);
    const tooHigh = run({ pod_type: 'PAID', no_of_spots: 10, ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 99 }] });
    expect(tooHigh[0].path).toEqual(['ticket_discount_tiers', 0, 'discount_pct']);
    expect(tooHigh[0].message.length).toBeGreaterThan(0);
  });

  it('refuses a pod type the stepper does not offer', () => {
    const issues: Array<{ path: unknown[] }> = [];
    const ctx = { addIssue: (issue: { path: unknown[] }) => issues.push(issue) } as unknown as z.RefinementCtx;
    refinePublish({ ...blankCreatePodForm, pod_type: 'OTHER' as never }, ctx, fallbackT);
    expect(issues.some((i) => i.path[0] === 'pod_type')).toBe(true);
  });
});

describe('toTierFieldErrors', () => {
  it('has nothing for no error', () => {
    expect(toTierFieldErrors(undefined, 2)).toBeUndefined();
  });

  it('reads a list message from the node or its root, and row messages by index', () => {
    expect(toTierFieldErrors({ message: 'List bad' }, 0)).toEqual({ list: 'List bad', rows: [] });
    expect(toTierFieldErrors({ root: { message: 'Root bad' } }, 1)).toEqual({ list: 'Root bad', rows: [{ min_tickets: undefined, discount_pct: undefined }] });
    expect(
      toTierFieldErrors({ '0': { min_tickets: { message: 'min' } }, '1': { discount_pct: { message: 'pct' } } }, 3)
    ).toEqual({
      list: undefined,
      rows: [
        { min_tickets: 'min', discount_pct: undefined },
        { min_tickets: undefined, discount_pct: 'pct' },
        { min_tickets: undefined, discount_pct: undefined },
      ],
    });
  });
});

function formHook(values: Partial<CreatePodFormValues> = {}) {
  return renderHook(() => {
    const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
    return { form, ...useOfferQuote(form), offer: offerOfForm(form) };
  });
}
const completeOffer = {
  pod_mode: 'PHYSICAL' as const,
  venue_id: 'v1',
  pod_date_time: new Date('2026-07-01T10:00:00.000Z'),
  pod_end_date_time: new Date('2026-07-01T12:00:00.000Z'),
  no_of_spots: 10,
  venue_offer_model: 'FLAT',
  venue_offer_rate: '500',
};

describe('useOfferQuote', () => {
  it('has no offer for a virtual pod, a held slot or an incomplete window', () => {
    expect(formHook({ pod_mode: 'VIRTUAL' }).result.current.offer).toBeNull();
    expect(formHook({ ...completeOffer, venue_slot_id: 'slot1' }).result.current.offer).toBeNull();
    expect(formHook({ ...completeOffer, venue_offer_rate: '' }).result.current.offer).toBeNull();
    expect(formHook({ ...completeOffer }).result.current.offer).toMatchObject({ model: 'FLAT', rate: 500, pax: 10 });
  });

  it('asks for nothing until an offer is complete, and says it is not loading', () => {
    const { result } = formHook({ pod_mode: 'VIRTUAL' });
    expect(h.quoteOpts?.skip).toBe(true);
    expect(result.current.quote).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('waits for the debounce, then returns the quote with the price at the venue minimum guests', async () => {
    vi.useFakeTimers();
    const quote = { total: 1000 };
    const quoteMin = { total: 800 };
    h.quote = { data: { venueOfferQuote: { ok: true, quote, quote_min: quoteMin, message: null } }, loading: false, error: undefined };
    const { result } = formHook(completeOffer);
    expect(result.current.loading).toBe(false);
    // Editing the rate is a new question: no answer is shown until the debounce has passed.
    act(() => result.current.form.setValue('venue_offer_rate', '600'));
    expect(result.current.loading).toBe(true);
    expect(result.current.quote).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.quote).toEqual(quote);
    expect(result.current.quoteMin).toEqual(quoteMin);
    expect(result.current.loading).toBe(false);
    expect(h.quoteOpts?.skip).toBe(false);
    expect(h.quoteOpts?.variables.venue_id).toBe('v1');
  });

  it('prices the minimum at the quote itself when the server prices no minimum, and a missing quote as none', async () => {
    vi.useFakeTimers();
    const quote = { total: 1000 };
    h.quote = { data: { venueOfferQuote: { ok: true, quote, quote_min: null, message: null } }, loading: false, error: undefined };
    const first = formHook(completeOffer);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(first.result.current.quoteMin).toEqual(quote);
    h.quote = { data: { venueOfferQuote: { ok: true, quote: null, quote_min: null, message: null } }, loading: false, error: undefined };
    const second = formHook(completeOffer);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(second.result.current.quote).toBeNull();
    expect(second.result.current.quoteMin).toBeNull();
  });

  it('says why an offer cannot be sent, or nothing when the server gives no reason', async () => {
    vi.useFakeTimers();
    h.quote = { data: { venueOfferQuote: { ok: false, quote: null, quote_min: null, message: 'Below minimum spend' } }, loading: false, error: undefined };
    const first = formHook(completeOffer);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(first.result.current.message).toBe('Below minimum spend');
    h.quote = { data: { venueOfferQuote: { ok: false, quote: null, quote_min: null, message: null } }, loading: false, error: undefined };
    const second = formHook(completeOffer);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(second.result.current.message).toBeNull();
  });

  it('reports a failed request and shows no quote', async () => {
    vi.useFakeTimers();
    const error = new Error('down');
    h.quote = { data: { venueOfferQuote: { ok: true, quote: { total: 1 }, quote_min: null, message: null } }, loading: false, error };
    const { result } = formHook(completeOffer);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.error).toBe(error);
    expect(result.current.quote).toBeNull();
  });
});

describe('ChipArrayField', () => {
  const field = (value: string[], over: Partial<React.ComponentProps<typeof ChipArrayField>> = {}) => {
    const onChange = vi.fn();
    render(<ChipArrayField label="Perks" value={value} onChange={onChange} {...over} />);
    return onChange;
  };
  const input = () => screen.getByTestId('chip-array-field-input-field');

  it('adds a trimmed chip with Enter or comma, and on blur', () => {
    const onChange = field(['a']);
    fireEvent.change(input(), { target: { value: ' b ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    fireEvent.change(input(), { target: { value: 'c' } });
    fireEvent.keyDown(input(), { key: ',' });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
    fireEvent.change(input(), { target: { value: 'd' } });
    fireEvent.blur(input());
    expect(onChange).toHaveBeenLastCalledWith(['a', 'd']);
  });

  it('ignores a blank, a duplicate, or a chip beyond the maximum, and clears the box', () => {
    const onChange = field(['a', 'b'], { max: 2 });
    fireEvent.change(input(), { target: { value: '  ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    fireEvent.change(input(), { target: { value: 'a' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    fireEvent.change(input(), { target: { value: 'z' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue('');
  });

  it('removes the last chip on Backspace in an empty box only, and any chip from its delete icon', () => {
    const onChange = field(['a', 'b']);
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    fireEvent.change(input(), { target: { value: 'x' } });
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input(), { key: 'q' });
    fireEvent.click(screen.getByTestId('chip-array-field-chip-a').querySelector('svg') as Element);
    expect(onChange).toHaveBeenLastCalledWith(['b']);
  });

  it('does nothing on Backspace with no chips, and shows the right hint and error text', () => {
    const onChange = field([], { placeholder: 'Type', helperText: 'Help' });
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(input()).toHaveAttribute('placeholder', 'Type');
  });

  it('shows the default hint and placeholder, and an error over the hint', () => {
    const { unmount } = render(<ChipArrayField label="Perks" value={[]} onChange={vi.fn()} />);
    expect(screen.getByText(fallbackT('mweb.createPod.chipMaxHint', { vars: { max: 20 } }))).toBeInTheDocument();
    expect(input()).toHaveAttribute('placeholder', fallbackT('mweb.createPod.chipPlaceholder'));
    unmount();
    render(<ChipArrayField label="Perks" value={[]} onChange={vi.fn()} error="Needed" helperText="Help" />);
    expect(screen.getByText('Needed')).toBeInTheDocument();
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
  });
});

describe('HashtagChipsField', () => {
  const mount = (text: string | undefined) => {
    function Harness() {
      const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, pod_hashtag_text: text as string } });
      return (
        <>
          <HashtagChipsField form={form} />
          <output data-testid="stored">{form.watch('pod_hashtag_text')}</output>
        </>
      );
    }
    render(<Harness />);
  };
  const input = () => screen.getByTestId('field-pod_hashtag_text-input');

  it('parses tags without the hash, blanks or duplicates', () => {
    expect(parseHashtags('#run, run  #yoga ')).toEqual(['run', 'yoga']);
    expect(parseHashtags('')).toEqual([]);
  });

  it('adds tags on Enter, space and comma, and on blur, storing them hash-prefixed', async () => {
    mount('#run');
    fireEvent.change(input(), { target: { value: 'yoga' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('stored')).toHaveTextContent('#run #yoga'));
    fireEvent.change(input(), { target: { value: 'swim' } });
    fireEvent.keyDown(input(), { key: ' ' });
    fireEvent.change(input(), { target: { value: 'cycle' } });
    fireEvent.keyDown(input(), { key: ',' });
    fireEvent.change(input(), { target: { value: 'hike' } });
    fireEvent.blur(input());
    await waitFor(() => expect(screen.getByTestId('stored')).toHaveTextContent('#run #yoga #swim #cycle #hike'));
  });

  it('adds nothing for a blank draft, and removes the last tag on Backspace in an empty box only', async () => {
    mount('#a #b');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByTestId('stored')).toHaveTextContent('#a #b');
    fireEvent.change(input(), { target: { value: 'x' } });
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(screen.getByTestId('stored')).toHaveTextContent('#a #b');
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.keyDown(input(), { key: 'Backspace' });
    await waitFor(() => expect(screen.getByTestId('stored')).toHaveTextContent(/^#a$/));
    fireEvent.keyDown(input(), { key: 'q' });
  });

  it('removes a tag from its delete icon, treats missing text as no tags and ignores Backspace with none', () => {
    mount(undefined);
    expect(screen.queryByTestId('hashtag-chip-a')).not.toBeInTheDocument();
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(screen.getByTestId('stored')).toHaveTextContent('');
  });

  it('deletes a chip with its icon', async () => {
    mount('#a #b');
    fireEvent.click(screen.getByTestId('hashtag-chip-a').querySelector('svg') as Element);
    await waitFor(() => expect(screen.getByTestId('stored')).toHaveTextContent(/^#b$/));
  });
});
