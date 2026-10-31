import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreatePodStepper from '../CreatePodStepper';
import { STEP_TITLES } from '../create-pod.form';
import { fallbackT } from '../../../../i18n/fallback';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod.types';

// A controllable feature-flag value for the products section.
const flagState = vi.hoisted(() => ({ value: false }));
vi.mock('../../../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => flagState.value,
}));

// NOT mocked: @duncit/utils is pure and its category filter is the behaviour
// this stepper exists to enforce. It used to be stubbed to a pass-through, which
// meant mWeb had zero coverage of the pod-category product rule while the native
// twin had real tests (rule 27). The dedicated cases live in
// ProductCategoryFilter.test.tsx.

// The blocked-content dialog: render each violation and expose jump/close.
vi.mock('@duncit/ui', () => ({
  ModerationBlockedDialog: ({
    violations,
    onJump,
    onClose,
  }: {
    violations: { id: string; message: string; stepIndex: number }[];
    onJump: (step: number) => void;
    onClose: () => void;
  }) =>
    violations.length === 0 ? null : (
      <div data-testid="blocked-dialog">
        {violations.map((v) => (
          <button key={v.id} type="button" onClick={() => onJump(v.stepIndex)}>
            {v.message}
          </button>
        ))}
        <button type="button" onClick={onClose}>
          close-blocked
        </button>
      </div>
    ),
}));

// StepHero renders the title so we can assert which step is visible.
vi.mock('../StepHero', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

// Step doubles: identify themselves; Money says whether it carries the venue
// offer, and Details mutates the form (dirty autosave) and offers its Edit.
vi.mock('../steps/WhatStep', () => ({
  default: () => <div>WhatStep</div>,
}));
vi.mock('../steps/WhereWhenStep', () => ({
  default: () => <div>WhereWhenStep</div>,
}));
vi.mock('../steps/MoneyStep', () => ({
  default: ({ sendsOffer }: { sendsOffer: boolean }) => <div>{sendsOffer ? 'MoneyStep with offer' : 'MoneyStep ticket only'}</div>,
}));
vi.mock('../steps/DetailsStep', () => ({
  default: ({
    form,
    onEditWhen,
  }: {
    form: { setValue: (n: string, v: unknown, o?: unknown) => void };
    onEditWhen: () => void;
  }) => (
    <div>
      <span>DetailsStep</span>
      <button
        type="button"
        onClick={() => form.setValue('pod_title', 'A Freshly Edited Title', { shouldDirty: true })}
      >
        edit-title
      </button>
      <button type="button" onClick={onEditWhen}>
        edit-when
      </button>
    </div>
  ),
}));
vi.mock('../steps/VenueSlotStep', async () => ({
  default: () => <div>VenueSlotStep</div>,
  VENUE_AVAILABLE_SLOTS: gql`
    query CreatePodVenueSlots($venue_id: ID!) {
      venueAvailableSlots(venue_id: $venue_id) {
        id
      }
    }
  `,
  // The stepper sizes the pod from the booked space — the real (pure) helper.
  venueSpaces: (await vi.importActual<typeof import('../steps/venueSpaces')>('../steps/venueSpaces')).venueSpaces,
}));

/** The Next button names the step it leads to ("Next: Money"). */
const NEXT = /^Next/;

const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);

const validVirtual = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  location_id: 'loc1',
  host_category_key: 'sup|sub',
  pod_title: 'A Valid Pod Title',
  club_id: 'club1',
  pod_mode: 'VIRTUAL',
  // Picked from the shared platform list, not typed.
  meeting_platform: 'ZOOM',
  meeting_url: 'https://zoom.us/j/123',
  pod_description: 'A sufficiently long description of the pod.',
  pod_date_time: future,
  // A virtual pod needs an end — its window is what marks a member present.
  pod_end_date_time: new Date(future.getTime() + 2 * 3600 * 1000),
  pod_type: 'FREE',
  pod_amount: 0,
  // A free pod says why it is free and accepts Duncit's free policy.
  free_reason: 'INITIATIVE',
  free_accepted: true,
  media_text: 'https://cdn.example.com/cover.jpg',
  what_this_pod_offers: ['Great fun'],
  agreed_to_terms: true,
  ...over,
});

const hostCat = {
  super_category_id: 'sup',
  category_id: 'cat',
  sub_category_id: 'sub',
  super_category_name: 'Sports',
  category_name: 'Running',
  sub_category_name: 'Trail',
};

function setup(props: Partial<React.ComponentProps<typeof CreatePodStepper>> = {}) {
  const onSaveDraft = vi.fn().mockResolvedValue('draft-1');
  const onModerate = vi.fn().mockResolvedValue({ allowed: true, violations: [] });
  const onPublish = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <CreatePodStepper
        initialValues={validVirtual()}
        initialStep={0}
        initialDraftId={null}
        clubs={[]}
        locations={[]}
        venues={[]}
        products={[]}
        subCategories={[]}
        hostCategories={[]}
        viewerUserId="u1"
        onSaveDraft={onSaveDraft}
        onModerate={onModerate}
        onPublish={onPublish}
        {...props}
      />
    </MockedProvider>,
  );
  return { ...utils, onSaveDraft, onModerate, onPublish };
}

beforeEach(() => {
  flagState.value = false;
  vi.clearAllMocks();
});

describe('CreatePodStepper', () => {
  it('renders the first step with its title', () => {
    setup();
    // What comes first; the details come last.
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(screen.getByText('WhatStep')).toBeInTheDocument();
    expect(screen.queryByText('DetailsStep')).not.toBeInTheDocument();
  });

  it('names the step Next leads to', () => {
    setup({ initialValues: validVirtual({ pod_mode: 'PHYSICAL' }) });
    expect(screen.getByRole('button', { name: 'Next: Where & when' })).toBeInTheDocument();
  });

  it('advances to the next step and persists a draft when values are valid', async () => {
    const { onSaveDraft } = setup();
    fireEvent.click(screen.getByRole('button', { name: NEXT }));
    // A virtual pod's Where & when is its meeting.
    expect(await screen.findByText(fallbackT('mweb.createPod.step3TitleVirtual'))).toBeInTheDocument();
    expect(screen.getByText('WhereWhenStep')).toBeInTheDocument();
    // The draft is saved against the step the host moved to.
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledWith(null, expect.objectContaining({ step: 1 })));
  });

  it('blocks Next on What when a multi-category host has not picked a category', async () => {
    const { onSaveDraft } = setup({
      hostCategories: [hostCat, { ...hostCat, sub_category_id: 'sub2' }],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: NEXT }));
    });
    // Category gate keeps us on What and nothing is persisted.
    expect(screen.getByText('WhatStep')).toBeInTheDocument();
    expect(screen.queryByText('WhereWhenStep')).not.toBeInTheDocument();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('auto-selects the sole host category so it advances past What', async () => {
    const { onSaveDraft } = setup({
      hostCategories: [hostCat],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    fireEvent.click(screen.getByRole('button', { name: NEXT }));
    expect(await screen.findByText('WhereWhenStep')).toBeInTheDocument();
    // The sole category key (Super|Sub) is what got saved.
    await waitFor(() =>
      expect(onSaveDraft).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ step: 1, payload: expect.stringContaining('"host_category_key":"sup|sub"') }),
      ),
    );
  });

  it('goes back to the previous step', async () => {
    setup({ initialStep: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText(STEP_TITLES[0])).toBeInTheDocument();
  });

  it('takes a virtual pod from its meeting to Money with only the ticket — it sends no venue offer', async () => {
    const { onSaveDraft } = setup({ initialStep: 1 });
    expect(screen.getByText(fallbackT('mweb.createPod.step3TitleVirtual'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: NEXT }));
    expect(await screen.findByText(STEP_TITLES[2])).toBeInTheDocument();
    expect(screen.getByText('MoneyStep ticket only')).toBeInTheDocument();
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledWith(null, expect.objectContaining({ step: 2 })));
  });

  it('holds a physical offer pod on Money until its offer is complete, and Back returns to Where & when', async () => {
    setup({ initialStep: 2, initialValues: validVirtual({ pod_mode: 'PHYSICAL', venue_id: 'venue-1' }) });
    expect(screen.getByText('MoneyStep with offer')).toBeInTheDocument();
    // An offer with no terms does not leave the step.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: NEXT }));
    });
    expect(screen.getByText('MoneyStep with offer')).toBeInTheDocument();
    expect(screen.queryByText('DetailsStep')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText(STEP_TITLES[1])).toBeInTheDocument();
    expect(screen.getByText('WhereWhenStep')).toBeInTheDocument();
  });

  it('shows a Pod Request pod no venue offer on Money — it books the slot its request holds', () => {
    setup({
      initialStep: 2,
      initialValues: validVirtual({ pod_mode: 'PHYSICAL', venue_id: 'venue-1', partner_request_id: 'req-1', venue_slot_id: 'slot-1' }),
    });
    expect(screen.getByText('MoneyStep ticket only')).toBeInTheDocument();
  });

  it('clamps a step past the last onto Details', () => {
    setup({ initialStep: 9 });
    expect(screen.getByText(STEP_TITLES[3])).toBeInTheDocument();
    expect(screen.getByText('DetailsStep')).toBeInTheDocument();
  });

  it("returns to Where & when from the summary's Edit on Details", async () => {
    setup({ initialStep: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'edit-when' }));
    expect(await screen.findByText('WhereWhenStep')).toBeInTheDocument();
  });

  it('publishes: moderates, persists then calls onPublish on the last step', async () => {
    const { onModerate, onPublish } = setup({ initialStep: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    await waitFor(() => expect(onModerate).toHaveBeenCalled());
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
  });

  it('shows the moderation dialog and jumps to the offending step when blocked', async () => {
    const onModerate = vi.fn().mockResolvedValue({
      allowed: false,
      violations: [{ field: 'pod_description', step: '', type: 'contact', message: 'No contact info allowed' }],
    });
    const { onPublish } = setup({ initialStep: 3, onModerate });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    expect(await screen.findByTestId('blocked-dialog')).toBeInTheDocument();
    expect(onPublish).not.toHaveBeenCalled();
    // Jump moves to the field's step (pod_description -> Details) and closes the dialog.
    fireEvent.click(screen.getByRole('button', { name: 'No contact info allowed' }));
    await waitFor(() => expect(screen.queryByTestId('blocked-dialog')).not.toBeInTheDocument());
    expect(screen.getByText(STEP_TITLES[3])).toBeInTheDocument();
    expect(screen.getByText('DetailsStep')).toBeInTheDocument();
  });

  it('closes the moderation dialog via its close action', async () => {
    const onModerate = vi.fn().mockResolvedValue({
      allowed: false,
      violations: [{ field: 'pod_title', step: '', type: 'x', message: 'Bad title' }],
    });
    setup({ initialStep: 3, onModerate });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    await screen.findByTestId('blocked-dialog');
    fireEvent.click(screen.getByRole('button', { name: 'close-blocked' }));
    await waitFor(() => expect(screen.queryByTestId('blocked-dialog')).not.toBeInTheDocument());
  });

  it('shows a generic error alert when publishing fails', async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error('Server exploded'));
    setup({ initialStep: 3, onPublish });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });

  it('clears stale product values from a draft when the products flag is off', () => {
    setup({
      initialValues: validVirtual({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
    });
    // Effect ran without throwing; the first step still renders.
    expect(screen.getByText('WhatStep')).toBeInTheDocument();
  });

  it('autosaves the draft after the debounce once the form is dirty', async () => {
    vi.useFakeTimers();
    try {
      // The title is edited on Details (the last step).
      const { onSaveDraft } = setup({ initialStep: 3 });
      await act(async () => {
        screen.getByRole('button', { name: 'edit-title' }).click();
      });
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(onSaveDraft).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('pins a violation on an unknown field to the title and jumps to its step', async () => {
    const onModerate = vi.fn().mockResolvedValue({
      allowed: false,
      violations: [{ field: 'something_new', step: '', type: 'x', message: 'Unknown field problem' }],
    });
    setup({ initialStep: 3, onModerate });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Unknown field problem' }));
    await waitFor(() => expect(screen.getByText('DetailsStep')).toBeInTheDocument());
  });

  it('shows the generic failure wording when publishing fails with something that is not an Error', async () => {
    const onPublish = vi.fn().mockRejectedValue('boom');
    setup({ initialStep: 3, onPublish });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    expect(await screen.findByText(fallbackT('mweb.createPod.createFailed'))).toBeInTheDocument();
  });

  it('publishes without stale product rows when the products flag is off', async () => {
    const { onPublish } = setup({
      initialStep: 3,
      initialValues: validVirtual({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    const input = onPublish.mock.calls[0][1];
    expect(input.products_enabled).toBeFalsy();
    expect(input.product_requests ?? []).toEqual([]);
  });

  it('keeps product rows when the products flag is on', async () => {
    flagState.value = true;
    const { onPublish } = setup({
      initialStep: 3,
      initialValues: validVirtual({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
      products: [{ id: 'p1', name: 'Mat' } as never],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
  });
});
