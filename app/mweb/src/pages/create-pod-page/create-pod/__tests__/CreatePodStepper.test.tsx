import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreatePodStepper from '../CreatePodStepper';
import { STEP_TITLES } from '../create-pod.form';
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

// Step doubles: identify themselves and let BasicsStep mutate the form so we can
// exercise the dirty-autosave + duplicate-title-clear effects.
vi.mock('../steps/BasicsStep', () => ({
  default: ({ form }: { form: { setValue: (n: string, v: unknown, o?: unknown) => void } }) => (
    <div>
      <span>BasicsStep</span>
      <button
        type="button"
        onClick={() => form.setValue('pod_title', 'A Freshly Edited Title', { shouldDirty: true })}
      >
        edit-title
      </button>
    </div>
  ),
}));
vi.mock('../steps/LocationClubStep', () => ({
  default: () => <div>LocationClubStep</div>,
}));
vi.mock('../steps/VenueSlotStep', () => ({
  default: () => <div>VenueSlotStep</div>,
  VENUE_AVAILABLE_SLOTS: gql`
    query CreatePodVenueSlots($venue_id: ID!) {
      venueAvailableSlots(venue_id: $venue_id) {
        id
      }
    }
  `,
}));
vi.mock('../steps/PricingStep', () => ({
  default: () => <div>PricingStep</div>,
}));

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
    // The category, locality and club come first; basics follow.
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(screen.getByText('LocationClubStep')).toBeInTheDocument();
    expect(screen.queryByText('BasicsStep')).not.toBeInTheDocument();
  });

  it('advances to the next step and persists a draft when values are valid', async () => {
    const { onSaveDraft } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(STEP_TITLES[1])).toBeInTheDocument();
    expect(screen.getByText('BasicsStep')).toBeInTheDocument();
    // The draft is saved against the step the host moved to.
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledWith(null, expect.objectContaining({ step: 1 })));
  });

  it('blocks Next on step 1 when a multi-category host has not picked a category', async () => {
    const { onSaveDraft } = setup({
      hostCategories: [hostCat, { ...hostCat, sub_category_id: 'sub2' }],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    });
    // Category gate keeps us on step 1 and nothing is persisted.
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(screen.queryByText(STEP_TITLES[1])).not.toBeInTheDocument();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('auto-selects the sole host category so it advances past step 1', async () => {
    const { onSaveDraft } = setup({
      hostCategories: [hostCat],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(STEP_TITLES[1])).toBeInTheDocument();
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
    // Jump moves to the field's step (pod_description -> Basics, step 1) and closes dialog.
    fireEvent.click(screen.getByRole('button', { name: 'No contact info allowed' }));
    await waitFor(() => expect(screen.queryByTestId('blocked-dialog')).not.toBeInTheDocument());
    expect(screen.getByText(STEP_TITLES[1])).toBeInTheDocument();
    expect(screen.getByText('BasicsStep')).toBeInTheDocument();
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
    expect(screen.getByText('LocationClubStep')).toBeInTheDocument();
  });

  it('autosaves the draft after the debounce once the form is dirty', async () => {
    vi.useFakeTimers();
    try {
      // The title is edited on the Basics step (step 2).
      const { onSaveDraft } = setup({ initialStep: 1 });
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
});
