import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodEditorPage, { type PodEditorPageProps } from '../../src/editor/PodEditorPage';
import { blankPodFormValues, type PodFormValues } from '../../src/types';
import { makeConfig, DATE_FORMATTER, SLOT_LABELS } from './helpers';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: any) => <span>picker:{label}</span>,
}));

vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: () => ({ data: { venueAvailableSlots: [] }, loading: false, error: undefined }),
}));

const values = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'Sunday Badminton',
  club_id: 'c1',
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  pod_date_time: new Date(Date.now() + 86_400_000),
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 8,
  media_text: 'https://cdn.example.com/court.jpg',
  ...over,
});

function renderPage(over: Partial<PodEditorPageProps> = {}) {
  const props: PodEditorPageProps = {
    editing: false,
    eyebrow: 'Admin · Pods',
    onBack: vi.fn(),
    backLabel: 'Back to pods',
    initialValues: values(),
    config: makeConfig(),
    busy: false,
    error: null,
    clubs: [{ id: 'c1', club_name: 'Sunset Club' }],
    venues: [{ id: 'v1', venue_name: 'Indiranagar Courts' }],
    getClubVenueIds: () => ['v1'],
    dateFormatter: DATE_FORMATTER,
    slotLabels: SLOT_LABELS,
    onSubmit: vi.fn(),
    ...over,
  };
  render(<PodEditorPage {...props} />);
  return props;
}

describe('PodEditorPage', () => {
  it('lays out the form beside the live member preview under the New Pod heading', () => {
    renderPage();
    expect(screen.getByText('Admin · Pods')).toBeInTheDocument();
    expect(screen.getByText('New Pod')).toBeInTheDocument();
    // The preview column renders the same values the save button will submit.
    expect(screen.getByText('Member preview')).toBeInTheDocument();
    expect(screen.getByText('In the pod list')).toBeInTheDocument();
    expect(screen.getByText('On the pod page')).toBeInTheDocument();
    expect(screen.getAllByText('Sunday Badminton').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('says Edit Pod when an existing pod is open', () => {
    renderPage({ editing: true });
    expect(screen.getByText('Edit Pod')).toBeInTheDocument();
  });

  it('takes a heading override for the Auto Pod editors', () => {
    renderPage({ editing: true, title: 'New Auto Pod' });
    expect(screen.getByText('New Auto Pod')).toBeInTheDocument();
    expect(screen.queryByText('Edit Pod')).not.toBeInTheDocument();
  });

  it('renders the intro and title extras it is given', () => {
    renderPage({
      intro: <div data-testid="intro">Hosts are assigned for you.</div>,
      titleExtras: <button type="button">Fill with AI</button>,
    });
    expect(screen.getByTestId('intro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fill with AI' })).toBeInTheDocument();
  });

  it('routes both the back button and the form Cancel to onBack', async () => {
    const user = userEvent.setup();
    const props = renderPage();
    await user.click(screen.getByRole('button', { name: 'Back to pods' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onBack).toHaveBeenCalledTimes(2);
  });

  it('surfaces the save error through the form', () => {
    renderPage({ error: 'Save failed' });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });
});
