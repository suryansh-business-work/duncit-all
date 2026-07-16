import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodForm, { type PodFormProps } from '../../src/PodForm';
import { blankPodFormValues, type PodFormValues } from '../../src/types';
import { makeConfig } from './helpers';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: any) => <span>picker:{label}</span>,
}));

vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: () => ({ data: { venueAvailableSlots: [] }, loading: false, error: undefined }),
}));

const validValues = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'A Valid Pod Title',
  club_id: 'c1',
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  pod_description: 'A sufficiently long description of the pod',
  pod_date_time: new Date(Date.now() + 86_400_000),
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 10,
  media_text: 'https://cdn.example.com/cover.jpg',
  ...over,
});

function renderForm(over: Partial<PodFormProps> = {}) {
  const props: PodFormProps = {
    initialValues: validValues(),
    config: makeConfig(),
    clubs: [{ id: 'c1', club_name: 'Club One' }],
    venues: [],
    getClubVenueIds: () => ['v1'],
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    ...over,
  };
  render(<PodForm {...props} />);
  return props;
}

describe('PodForm', () => {
  it('renders Cancel, Save as Draft and Save actions', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('submits a valid form as a publish', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).toEqual({ draft: false });
  });

  it('submits as a draft via Save as Draft', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).toEqual({ draft: true });
  });

  it('does not submit an invalid form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit, initialValues: validValues({ pod_title: 'no' }) });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows the error alert when an error is present', () => {
    renderForm({ error: 'Save failed' });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('hides Save as Draft when editing with hideDraftOnEdit', () => {
    renderForm({ initialValues: validValues({ pod_id: 'pod-1' }), hideDraftOnEdit: true });
    expect(screen.queryByRole('button', { name: 'Save as Draft' })).not.toBeInTheDocument();
  });

  it('keeps Save as Draft when creating even with hideDraftOnEdit', () => {
    renderForm({ initialValues: validValues({ pod_id: '' }), hideDraftOnEdit: true });
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeInTheDocument();
  });

  it('hands the RHF methods to onReady', () => {
    const onReady = vi.fn();
    renderForm({ onReady });
    expect(onReady).toHaveBeenCalled();
    expect(typeof onReady.mock.calls[0][0].handleSubmit).toBe('function');
  });

  it('disables the actions and shows a saving label while busy', () => {
    renderForm({ busy: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeDisabled();
  });
});
