import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodForm, { type PodFormProps } from '../../src/PodForm';
import { blankAutoPodFormValues, type PodFormValues } from '../../src/types';
import type { AutoPodAudience } from '../../src/auto-pod/audience-queries';
import { DATE_FORMATTER, SLOT_LABELS, makeConfig } from './helpers';

// The category cascade reads the admin tree; step 1 reads the audience.
const CATEGORIES = [
  { id: 'sup-sports', name: 'Sports', slug: 'sports', level: 'SUPER', parent_id: null },
  { id: 'cat-racket', name: 'Racket', slug: 'racket', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-racket' },
];
const apollo = vi.hoisted(() => ({
  audience: null as unknown,
  loading: false,
  error: undefined as Error | undefined,
  audienceCalls: [] as { skip?: boolean; variables?: Record<string, unknown> }[],
}));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (doc: unknown, options: { skip?: boolean; variables?: Record<string, unknown> }) => {
    if (String(doc).includes('autoPodAudience')) {
      apollo.audienceCalls.push(options);
      if (options?.skip) return { data: undefined, loading: false, error: undefined };
      return {
        data: apollo.audience ? { autoPodAudience: apollo.audience } : undefined,
        loading: apollo.loading,
        error: apollo.error,
      };
    }
    return { data: { categories: CATEGORIES, venueAvailableSlots: [] }, loading: false, error: undefined };
  },
}));
// The drawer's grid is AG Grid, proven in its own package; here only its mount matters.
vi.mock('@duncit/table', () => ({
  clientTableFetch: (rows: unknown[]) => () => Promise.resolve({ rows, total: rows.length }),
  DuncitTable: (props: { tableId: string }) => <div data-testid="table">{props.tableId}</div>,
}));
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: { label: string }) => <span>picker:{label}</span>,
}));

const audience = (over: Partial<AutoPodAudience> = {}): AutoPodAudience => ({
  venue_count: 2,
  host_count: 3,
  club_admin_count: 1,
  venues: [],
  hosts: [],
  club_admins: [],
  ...over,
});

const template = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankAutoPodFormValues,
  super_category_id: 'sup-sports',
  sub_category_id: 'sub-badminton',
  pod_title: 'Sunday Doubles',
  pod_description: 'Friendly doubles for everyone.',
  pod_amount: 500,
  no_of_spots: 8,
  media_text: 'https://cdn.example.com/court.jpg',
  ...over,
});

function renderStepper(over: Partial<PodFormProps> = {}) {
  const props: PodFormProps = {
    initialValues: template(),
    config: makeConfig({ autoPod: true, showAutoPodAudience: true, showReel: true }),
    clubs: [],
    venues: [],
    getClubVenueIds: () => [],
    dateFormatter: DATE_FORMATTER,
    slotLabels: SLOT_LABELS,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    ...over,
  };
  render(<PodForm {...props} />);
  return props;
}

const nextButton = () => screen.getByRole('button', { name: 'Next' });
const clickNext = async (user: ReturnType<typeof userEvent.setup>) => user.click(nextButton());

afterEach(() => {
  apollo.audience = null;
  apollo.loading = false;
  apollo.error = undefined;
  apollo.audienceCalls = [];
});

describe('AutoPodStepper', () => {
  it('opens on the category step and holds Next while any count is zero', () => {
    apollo.audience = audience({ host_count: 0 });
    renderStepper();
    // 'Pod category' is also the category field's legend, so count rather than pick.
    for (const label of ['Pod category', 'Pod details', 'Review & roll out']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByTestId('auto-pod-category')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hosts: 0' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This category has no hosts yet');
    expect(nextButton()).toBeDisabled();
    // The count was asked for THIS sub-category.
    expect(apollo.audienceCalls.at(-1)?.variables).toEqual({ sub_category_id: 'sub-badminton' });
  });

  it('does not count until a sub-category is chosen', () => {
    renderStepper({ initialValues: template({ super_category_id: '', sub_category_id: '' }) });
    expect(apollo.audienceCalls.at(-1)?.skip).toBe(true);
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(nextButton()).toBeDisabled();
  });

  it('walks category → details → review and rolls the template out', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    const props = renderStepper();
    expect(nextButton()).toBeEnabled();
    await clickNext(user);

    // Step 2: the mode first, then the sections — no venue, no Payment & Charges.
    expect(screen.getByTestId('auto-pod-mode')).toBeInTheDocument();
    expect(screen.getByText('1. Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Pod Reel')).toBeInTheDocument();
    expect(screen.queryByText(/Payment & Charges/)).not.toBeInTheDocument();
    expect(screen.queryByText(/When, Where/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-pod-category')).not.toBeInTheDocument();
    await clickNext(user);

    // Step 3: read-only, and the one button that submits.
    expect(await screen.findByTestId('auto-pod-review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roll out Auto Pod' }));
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalled());
    expect((props.onSubmit as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual({ draft: false });
  });

  it('refuses to open the review while the details are invalid', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper({ initialValues: template({ pod_title: 'no' }) });
    await clickNext(user);
    await clickNext(user);
    expect(await screen.findByText('Fix the highlighted fields before continuing.')).toBeInTheDocument();
    expect(screen.getByTestId('auto-pod-mode')).toBeInTheDocument();
    expect(screen.queryByTestId('auto-pod-review')).not.toBeInTheDocument();
  });

  it('goes back a step, and jumps to a completed step from the header', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    await clickNext(user);
    await clickNext(user);
    await screen.findByTestId('auto-pod-review');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('auto-pod-mode')).toBeInTheDocument();
    // A step already passed is a tab in the header (MUI's Stepper is a tablist).
    await user.click(screen.getByRole('tab', { name: /Pod category/ }));
    expect(screen.getByTestId('auto-pod-category')).toBeInTheDocument();
  });

  it('labels the last button Save changes when editing, and Saving… while busy', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper({ editing: true });
    await clickNext(user);
    await clickNext(user);
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('holds Next on the details step while a save is in flight', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper({ busy: true });
    await clickNext(user);
    // Busy also holds Next on the details step, so the review is reached on
    // a template that is already valid only after the flag clears — here the
    // review is opened first, then busy is what the button reflects.
    expect(nextButton()).toBeDisabled();
  });

  it('skips the audience entirely on a surface that hides it', () => {
    renderStepper({ config: makeConfig({ autoPod: true, showAutoPodAudience: false }) });
    expect(screen.queryByTestId('auto-pod-audience')).not.toBeInTheDocument();
    expect(apollo.audienceCalls.at(-1)?.skip).toBe(true);
    expect(nextButton()).toBeEnabled();
  });

  it('opens the drawer behind a count, and closes it again', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper();
    await user.click(screen.getByRole('button', { name: 'Venues: 2' }));
    expect(await screen.findByText('Venues in this category')).toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveTextContent('auto-pod-audience-venues');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('auto-pod-audience-drawer')).not.toBeInTheDocument());
  });

  // The host brings the meeting link and the window when they assign
  // themselves, so a virtual template asks for neither — it only loses the
  // products a virtual pod could never hand out.
  it('gives a virtual template no Meeting Details section and no products', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper({
      config: makeConfig({ autoPod: true, showAutoPodAudience: true, showProducts: true }),
      initialValues: template({ pod_mode: 'VIRTUAL' }),
    });
    await clickNext(user);
    expect(screen.queryByText(/Meeting Details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approved Products/)).not.toBeInTheDocument();
  });

  it('offers a physical template the products of its own category, and no venue section', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    renderStepper({ config: makeConfig({ autoPod: true, showAutoPodAudience: true, showProducts: true }) });
    await clickNext(user);
    expect(screen.getByText('4. Approved Products')).toBeInTheDocument();
    expect(screen.queryByText(/Meeting Details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/When, Where/)).not.toBeInTheDocument();
  });

  it('surfaces a submit error on whichever step is open, and cancels', async () => {
    const user = userEvent.setup();
    apollo.audience = audience();
    const props = renderStepper({ error: 'Rejected:\nno profanity' });
    expect(screen.getByText(/Rejected:/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('says it is counting while the count is in flight', () => {
    apollo.loading = true;
    renderStepper();
    expect(screen.getByText('Counting…')).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
  });

  it('reports a failed count', () => {
    apollo.error = new Error('boom');
    renderStepper();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not count the partners for this category.');
    expect(nextButton()).toBeDisabled();
  });
});
