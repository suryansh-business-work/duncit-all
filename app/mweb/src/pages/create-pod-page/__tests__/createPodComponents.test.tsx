import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { MemoryRouter } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';

import ClubAdminContactRow from '../create-pod/ClubAdminContactRow';
import ClubDetailsDialog from '../create-pod/ClubDetailsDialog';
import ClubPreview from '../create-pod/ClubPreview';
import OptionalSettingsCards from '../create-pod/OptionalSettingsCards';
import PodTypeCards from '../create-pod/PodTypeCards';
import StepFooterBar from '../create-pod/StepFooterBar';
import TermsAgreement from '../create-pod/TermsAgreement';
import VenueContactCard from '../create-pod/VenueContactCard';
import VenuePicker from '../create-pod/VenuePicker';
import VirtualMeetingFields from '../create-pod/VirtualMeetingFields';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  details: { data: undefined as unknown, loading: false, error: undefined as unknown },
  detailsOpts: undefined as unknown,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: unknown) => {
    h.detailsOpts = opts;
    return h.details;
  },
}));
vi.mock('../../../hooks/useBrandingAssets', () => ({ useBrandingAssets: () => ({ termsUrl: 'https://duncit.example/terms' }) }));

const theme = createTheme();

function FormHarness({
  values,
  errors = {},
  children,
}: Readonly<{
  values?: Partial<CreatePodFormValues>;
  errors?: Record<string, string>;
  children: (form: ReturnType<typeof useForm<CreatePodFormValues>>) => ReactNode;
}>) {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  useEffect(() => {
    for (const [field, message] of Object.entries(errors)) {
      form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <MemoryRouter>
          <FormProvider {...form}>{children(form)}</FormProvider>
        </MemoryRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.details = { data: undefined, loading: false, error: undefined };
});

describe('ClubAdminContactRow', () => {
  it('shows a tappable chip per channel the admin has, with WhatsApp opening in a new tab', () => {
    render(<ClubAdminContactRow admin={{ id: 'a1', name: 'Asha', phone: '+9198', whatsapp: '+9199', email: 'a@x.com', avatar_url: 'a.png' }} />);
    expect(screen.getByTestId('club-preview-admin-phone')).toHaveAttribute('href', expect.stringContaining('tel:'));
    expect(screen.getByTestId('club-preview-admin-whatsapp')).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('club-preview-admin-whatsapp')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('club-preview-admin-email')).toHaveAttribute('href', 'mailto:a@x.com');
    expect(screen.getByTestId('club-preview-admin-email')).not.toHaveAttribute('target');
  });

  it('shows only the name and an initial when the admin shared no channel', () => {
    render(<ClubAdminContactRow admin={{ id: 'a2', name: 'zed' }} />);
    expect(screen.getByTestId('club-preview-admin')).toHaveTextContent('Z');
    expect(screen.queryByTestId('club-preview-admin-phone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-preview-admin-whatsapp')).not.toBeInTheDocument();
  });

  it('shows a question mark for an unnamed admin and skips a WhatsApp number that is not dialable', () => {
    render(<ClubAdminContactRow admin={{ id: 'a3', name: '', whatsapp: '   ' }} />);
    expect(screen.getByTestId('club-preview-admin')).toHaveTextContent('?');
    expect(screen.queryByTestId('club-preview-admin-whatsapp')).not.toBeInTheDocument();
  });
});

describe('ClubDetailsDialog and ClubPreview', () => {
  const club = (over: object = {}) => ({
    id: 'c1',
    club_name: 'Runners',
    club_description: '  Weekend runs  ',
    club_feature_images_and_videos: [{ url: 'logo.png', type: 'IMAGE' }, { url: 'clip.mp4', type: 'VIDEO' }, { url: 'plain.png' }],
    matched_venues_count: 3,
    ...over,
  });
  const dialog = (props: { open?: boolean; club?: object } = {}) =>
    render(<ClubDetailsDialog club={(props.club ?? club()) as never} open={props.open ?? true} onClose={vi.fn()} />);

  it('does not read the extras until it opens', () => {
    dialog({ open: false });
    expect((h.detailsOpts as { skip: boolean }).skip).toBe(true);
  });

  it('shows a spinner on the first read and the failure when it cannot be read', () => {
    h.details = { data: undefined, loading: true, error: undefined };
    const { unmount } = dialog();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();
    h.details = { data: undefined, loading: false, error: new Error('x') };
    dialog();
    expect(screen.getByText(fallbackT('mweb.createPod.clubDetailsLoadFailed'))).toBeInTheDocument();
  });

  it('fails the same way when the answer has no club', () => {
    h.details = { data: { club: null }, loading: false, error: undefined };
    dialog();
    expect(screen.getByText(fallbackT('mweb.createPod.clubDetailsLoadFailed'))).toBeInTheDocument();
  });

  it('shows the gallery of images only, the trimmed description, the rating and each admin', () => {
    h.details = {
      data: { club: { id: 'c1', rating: 4.25, ratings_count: 8, club_whats_app_community_link: null, club_whats_app_group_link: null, club_admins: [{ id: 'a1', name: 'Asha' }] } },
      loading: false,
      error: undefined,
    };
    dialog();
    expect(screen.getAllByRole('img').filter((img) => img.getAttribute('alt') === 'Runners')).toHaveLength(2);
    expect(screen.getByText('Weekend runs')).toBeInTheDocument();
    expect(screen.getByTestId('club-preview-rating')).toHaveTextContent('4.3');
    expect(screen.getByTestId('club-preview-admin')).toHaveTextContent('Asha');
  });

  it('says there are no ratings or admins yet, and falls back to a no-description line and no gallery', () => {
    h.details = { data: { club: { id: 'c1', rating: 0, ratings_count: 0, club_admins: [] } }, loading: false, error: undefined };
    dialog({ club: club({ club_description: '  ', club_feature_images_and_videos: undefined }) });
    expect(screen.getByTestId('club-preview-rating')).toHaveTextContent(fallbackT('mweb.createPod.clubNoRatings'));
    expect(screen.getByText(fallbackT('mweb.podDetails.clubAdminsEmpty'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.createPod.noDescription'))).toBeInTheDocument();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('falls back to no-description for a missing description and closes from its button', () => {
    h.details = { data: { club: { id: 'c1', rating: 0, ratings_count: 0, club_admins: [] } }, loading: false, error: undefined };
    const onClose = vi.fn();
    render(<ClubDetailsDialog club={club({ club_description: undefined }) as never} open onClose={onClose} />);
    expect(screen.getByText(fallbackT('mweb.createPod.noDescription'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('club-preview-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog body while it closes without asking for the extras', async () => {
    h.details = { data: { club: { id: 'c1', rating: 5, ratings_count: 1, club_admins: [] } }, loading: false, error: undefined };
    const view = render(<ClubDetailsDialog club={club() as never} open onClose={vi.fn()} />);
    view.rerender(<ClubDetailsDialog club={club() as never} open={false} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('club-preview-dialog')).not.toBeInTheDocument());
  });

  it('shows nothing without a club, and the club with its cover, venue count and details button', () => {
    const { container, unmount } = render(<ClubPreview club={null} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    render(<ClubPreview club={club() as never} />);
    expect(screen.getByTestId('club-preview')).toHaveTextContent('Runners');
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent(fallbackT('mweb.createPod.venueMany', { vars: { count: 3 } }));
    expect(screen.getByTestId('club-preview').querySelector('img')).toHaveAttribute('src', 'logo.png');
    h.details = { data: undefined, loading: true, error: undefined };
    fireEvent.click(screen.getByTestId('club-preview-details'));
    expect(screen.getByTestId('club-preview-dialog')).toBeInTheDocument();
  });

  it('says one venue in the singular, none when unknown, and takes an untyped image as the cover', () => {
    const { unmount } = render(<ClubPreview club={club({ matched_venues_count: 1, club_feature_images_and_videos: [{ url: 'plain.png' }] }) as never} />);
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent(fallbackT('mweb.createPod.venueOne'));
    expect(screen.getByTestId('club-preview').querySelector('img')).toHaveAttribute('src', 'plain.png');
    unmount();
    render(<ClubPreview club={club({ matched_venues_count: undefined, club_feature_images_and_videos: undefined }) as never} />);
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent(fallbackT('mweb.createPod.venueMany', { vars: { count: 0 } }));
  });
});

describe('OptionalSettingsCards', () => {
  const cards = (values: Partial<CreatePodFormValues> = {}) => render(<FormHarness values={values}>{(form) => <OptionalSettingsCards form={form} />}</FormHarness>);

  it('invites adding both fields when they are empty, and opens the info dialog from its row', async () => {
    cards();
    expect(screen.getByTestId('optional-info')).not.toHaveTextContent(fallbackT('mweb.createPod.summaryAdded'));
    fireEvent.click(screen.getByTestId('optional-info'));
    expect(await screen.findByTestId('optional-settings-dialog')).toHaveTextContent(fallbackT('mweb.createPod.additionalInfoTitle'));
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.createPod.podInfoLabel')), { target: { value: 'Bring water' } });
    fireEvent.click(screen.getByTestId('optional-settings-done'));
    await waitFor(() => expect(screen.getByTestId('optional-info')).toHaveTextContent(fallbackT('mweb.createPod.summaryAdded')));
  });

  it('counts the perks once filled, and edits them in the perks dialog', async () => {
    cards({ available_perks: ['Parking', 'Water'] });
    expect(screen.getByTestId('optional-perks')).toHaveTextContent(fallbackT('mweb.createPod.summaryCount', { vars: { count: 2 } }));
    fireEvent.click(screen.getByTestId('optional-perks'));
    expect(await screen.findByTestId('create-pod-perks')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('create-pod-perks-input-field'), { target: { value: 'Snacks' } });
    fireEvent.keyDown(screen.getByTestId('create-pod-perks-input-field'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('optional-perks')).toHaveTextContent(fallbackT('mweb.createPod.summaryCount', { vars: { count: 3 } })));
    fireEvent.click(screen.getByTestId('optional-settings-close'));
    await waitFor(() => expect(screen.queryByTestId('optional-settings-dialog')).not.toBeInTheDocument());
  });

  it('shows a validation error on the perks inside their dialog', async () => {
    render(<FormHarness errors={{ available_perks: 'Too many perks' }}>{(form) => <OptionalSettingsCards form={form} />}</FormHarness>);
    fireEvent.click(screen.getByTestId('optional-perks'));
    expect(await screen.findByText('Too many perks')).toBeInTheDocument();
  });

  it('shows the add prompt for empty perks and a pod info of only spaces as empty', () => {
    cards({ pod_info: '   ' });
    expect(screen.getByTestId('optional-info')).not.toHaveTextContent(fallbackT('mweb.createPod.summaryAdded'));
    expect(screen.getByTestId('optional-perks')).not.toHaveTextContent(/\d/);
  });
});

describe('PodTypeCards', () => {
  const cards = (values: Partial<CreatePodFormValues> = {}) =>
    render(
      <FormHarness values={values}>
        {(form) => (
          <>
            <PodTypeCards form={form} />
            <output data-testid="state">{JSON.stringify({ type: form.watch('pod_type'), amount: form.watch('pod_amount'), enabled: form.watch('ticket_discount_enabled'), tiers: form.watch('ticket_discount_tiers') })}</output>
          </>
        )}
      </FormHarness>
    );
  const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

  it('switching to free clears the price and the ticket discount; switching back blanks the price', async () => {
    cards({ pod_type: 'PAID', pod_amount: 300, ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }] });
    fireEvent.click(within(screen.getByTestId('create-pod-free')).getByRole('button'));
    await waitFor(() => expect(state()).toEqual({ type: 'FREE', amount: 0, enabled: false, tiers: [] }));
    fireEvent.click(within(screen.getByTestId('create-pod-paid')).getByRole('button'));
    await waitFor(() => expect(state().type).toBe('PAID'));
    expect(state().amount).toBeNull();
  });

  it('does nothing when the chosen type is already selected', async () => {
    cards({ pod_type: 'PAID', pod_amount: 300 });
    const pressed = (id: string) => within(screen.getByTestId(id)).getByRole('button');
    fireEvent.click(pressed('create-pod-paid'));
    await act(async () => undefined);
    expect(state().amount).toBe(300);
    fireEvent.click(pressed('create-pod-free'));
    await waitFor(() => expect(state().type).toBe('FREE'));
    fireEvent.click(pressed('create-pod-free'));
    await act(async () => undefined);
    expect(state().amount).toBe(0);
  });
});

describe('StepFooterBar', () => {
  const bar = (over: Partial<React.ComponentProps<typeof StepFooterBar>> = {}) => {
    const spies = { onBack: vi.fn(), onNext: vi.fn(), onSubmit: vi.fn() };
    render(
      <ThemeProvider theme={theme}>
        <StepFooterBar isFirst={false} isLast={false} busy={false} {...spies} {...over} />
      </ThemeProvider>
    );
    return spies;
  };

  it('goes back and next in the middle of the stepper', () => {
    const { onBack, onNext } = bar();
    fireEvent.click(screen.getByTestId('create-pod-back'));
    fireEvent.click(screen.getByTestId('create-pod-submit'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('cannot go back from the first step', () => {
    bar({ isFirst: true });
    expect(screen.getByTestId('create-pod-back')).toBeDisabled();
  });

  it('offers Create Pod on the last step, creating while busy, and blocks it when the pricing rules fail', () => {
    const { unmount } = render(<div />);
    unmount();
    const spies = bar({ isLast: true });
    fireEvent.click(screen.getByTestId('create-pod-submit'));
    expect(screen.getByTestId('create-pod-submit')).toHaveTextContent(fallbackT('mweb.createPod.createPod'));
    expect(spies.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows Creating and disables both actions while busy', () => {
    bar({ isLast: true, busy: true });
    expect(screen.getByTestId('create-pod-submit')).toHaveTextContent(fallbackT('mweb.createPod.creating'));
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
    expect(screen.getByTestId('create-pod-back')).toBeDisabled();
  });

  it('keeps Create Pod disabled while step-four rules fail', () => {
    bar({ isLast: true, submitDisabled: true });
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
  });
});

describe('TermsAgreement', () => {
  const terms = (errors: Record<string, string> = {}) =>
    render(
      <FormHarness errors={errors}>
        {(form) => (
          <>
            <TermsAgreement form={form} />
            <output data-testid="agreed">{String(form.watch('agreed_to_terms'))}</output>
          </>
        )}
      </FormHarness>
    );

  it('links the terms and records the host agreement', () => {
    terms();
    expect(screen.getByTestId('terms-link')).toHaveAttribute('href', 'https://duncit.example/terms');
    expect(screen.queryByTestId('agreed_to_terms-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('create-pod-terms-checkbox'));
    expect(screen.getByTestId('agreed')).toHaveTextContent('true');
  });

  it('shows the message when the terms are not accepted', async () => {
    terms({ agreed_to_terms: 'Accept the terms' });
    expect(await screen.findByTestId('agreed_to_terms-error')).toHaveTextContent('Accept the terms');
  });
});

describe('VenueContactCard and VenuePicker', () => {
  const venue = (over: object = {}) => ({
    id: 'v1',
    venue_type: 'Cafe',
    capacity: 40,
    venue_name: 'Court One',
    address_line1: '1 Road',
    locality: 'Koregaon',
    city: 'Pune',
    state: 'MH',
    postal_code: '411001',
    owner_name: 'Asha',
    owner_phone: '+9198',
    owner_email: 'o@x.com',
    cover_image_url: 'cover.png',
    ...over,
  });

  it('shows the address, call and directions actions and the venue contact', () => {
    render(<VenueContactCard venue={venue() as never} />);
    expect(screen.getByTestId('create-pod-venue-contact')).toHaveTextContent('1 Road, Koregaon, Pune, MH, 411001');
    expect(screen.getByRole('link', { name: fallbackT('mweb.createPod.callVenue') })).toHaveAttribute('href', 'tel:+9198');
    expect(screen.getByRole('link', { name: fallbackT('mweb.createPod.getDirections') })).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'o@x.com' })).toHaveAttribute('href', 'mailto:o@x.com');
  });

  it('omits the call action, the email, and the address when the venue gave none, naming the venue as the contact', () => {
    render(<VenueContactCard venue={venue({ owner_phone: '', owner_email: '', owner_name: '', address_line1: '', locality: '', city: '', state: '', postal_code: '' }) as never} />);
    expect(screen.queryByRole('link', { name: fallbackT('mweb.createPod.callVenue') })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Court One').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the venue type and capacity chips only when the venue has them', () => {
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <VenuePicker venues={[venue()] as never} selectedId='' onSelect={vi.fn()} />
      </ThemeProvider>
    );
    expect(screen.getByText('Cafe')).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.createPod.upTo', { vars: { capacity: 40 } }))).toBeInTheDocument();
    unmount();
    render(
      <ThemeProvider theme={theme}>
        <VenuePicker venues={[venue({ venue_type: '', capacity: 0 })] as never} selectedId='' onSelect={vi.fn()} />
      </ThemeProvider>
    );
    expect(screen.queryByText('Cafe')).not.toBeInTheDocument();
    expect(screen.queryByText(/Up to/)).not.toBeInTheDocument();
  });

  it('picks a venue and marks the selected one, with a cover when it has one', () => {
    const onSelect = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <VenuePicker venues={[venue(), venue({ id: 'v2', venue_name: 'Court Two', cover_image_url: null })] as never} selectedId="v1" onSelect={onSelect} />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: 'Court One' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Court Two' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Court Two' }));
    expect(onSelect).toHaveBeenCalledWith('v2');
  });
});

describe('VirtualMeetingFields errors', () => {
  it('shows the duration between a start and an end, and the meeting link error', async () => {
    render(
      <FormHarness
        values={{ pod_mode: 'VIRTUAL', pod_date_time: new Date(2030, 0, 1, 10, 0), pod_end_date_time: new Date(2030, 0, 1, 11, 30) }}
        errors={{ meeting_url: 'Link needed' }}
      >
        {(form) => <VirtualMeetingFields form={form} />}
      </FormHarness>
    );
    expect(await screen.findByText('Link needed')).toBeInTheDocument();
    expect(screen.getByTestId('pod-duration')).toHaveTextContent(/1/);
  });

  it('shows the validation message on each date and the platform, and tolerates a missing platform value', async () => {
    render(
      <FormHarness
        values={{ pod_mode: 'VIRTUAL', meeting_platform: undefined as never }}
        errors={{ meeting_platform: 'Pick one', pod_date_time: 'Start needed', pod_end_date_time: 'End needed' }}
      >
        {(form) => <VirtualMeetingFields form={form} />}
      </FormHarness>
    );
    expect(await screen.findByText('Pick one')).toBeInTheDocument();
    expect(screen.getByText('Start needed')).toBeInTheDocument();
    expect(screen.getByText('End needed')).toBeInTheDocument();
  });
});
