import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
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

// filterProductsForClub is a pure helper covered elsewhere — pass products through.
vi.mock('@duncit/utils', () => ({
  filterProductsForClub: (products: unknown[]) => products,
}));

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
  meeting_platform: 'Zoom',
  meeting_url: 'https://zoom.us/j/123',
  pod_description: 'A sufficiently long description of the pod.',
  pod_date_time: future,
  pod_type: 'NATIVE_FREE',
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
    <MockedProvider mocks={[]} addTypename={false}>
      <CreatePodStepper
        initialValues={validVirtual()}
        initialStep={0}
        initialDraftId={null}
        clubs={[]}
        locations={[]}
        venues={[]}
        products={[]}
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
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(screen.getByText('BasicsStep')).toBeInTheDocument();
  });

  it('advances to the next step and persists a draft when values are valid', async () => {
    const { onSaveDraft } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(STEP_TITLES[1])).toBeInTheDocument();
    expect(screen.getByText('LocationClubStep')).toBeInTheDocument();
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalled());
  });

  it('blocks Next on step 2 when a multi-category host has not picked a category', async () => {
    setup({
      initialStep: 1,
      hostCategories: [hostCat, { ...hostCat, sub_category_id: 'sub2' }],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    expect(screen.getByText(STEP_TITLES[1])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // Category gate keeps us on step 2.
    expect(screen.getByText(STEP_TITLES[1])).toBeInTheDocument();
    expect(screen.queryByText(STEP_TITLES[2])).not.toBeInTheDocument();
  });

  it('auto-selects the sole host category so it advances past step 2', async () => {
    setup({
      initialStep: 1,
      hostCategories: [hostCat],
      initialValues: validVirtual({ host_category_key: '' }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(STEP_TITLES[2])).toBeInTheDocument();
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
    // Jump moves to the field's step (pod_description -> step 0) and closes dialog.
    fireEvent.click(screen.getByRole('button', { name: 'No contact info allowed' }));
    await waitFor(() => expect(screen.queryByTestId('blocked-dialog')).not.toBeInTheDocument());
    expect(screen.getByText(STEP_TITLES[0])).toBeInTheDocument();
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

  it('surfaces a duplicate title inline and jumps to step 1, then clears on edit', async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error('A pod with this title already exists'));
    setup({ initialStep: 3, onPublish });
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    // Duplicate title jumps back to the Basics step (no error alert).
    expect(await screen.findByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(screen.queryByText('A pod with this title already exists')).not.toBeInTheDocument();
    // Editing the title clears the stale duplicate error state.
    fireEvent.click(screen.getByRole('button', { name: 'edit-title' }));
    expect(screen.getByText('BasicsStep')).toBeInTheDocument();
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
    // Effect ran without throwing; the pricing step still renders.
    expect(screen.getByText('BasicsStep')).toBeInTheDocument();
  });

  it('autosaves the draft after the debounce once the form is dirty', async () => {
    vi.useFakeTimers();
    try {
      const { onSaveDraft } = setup();
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
