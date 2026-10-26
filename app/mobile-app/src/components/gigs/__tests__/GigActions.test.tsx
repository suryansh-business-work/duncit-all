import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { GigJob } from '@duncit/utils';

import { GigJobStatus } from '@/generated/graphql/graphql';
import {
  ExpressGigInterestDocument,
  GigJobInterestsDocument,
  SetGigJobStatusDocument,
} from '@/graphql/gigs';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { GigInterestsList } from '../GigInterestsList';
import { GigOwnerActions } from '../GigOwnerActions';
import { GigViewerActions } from '../GigViewerActions';
import { InterestSheet } from '../InterestSheet';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const AUTH = { auth: true };

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

const jobOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'g1',
    title: 'Wedding DJ',
    status: 'OPEN',
    is_mine: false,
    viewer_interested: false,
    poster_name: 'Asha',
    contact: null,
    ...patch,
  }) as unknown as GigJob;

describe('GigOwnerActions', () => {
  const mount = (job = jobOf({ is_mine: true })) => {
    const onChanged = jest.fn();
    renderWithProviders(<GigOwnerActions job={job} onChanged={onChanged} />);
    return onChanged;
  };

  it('offers editing, which opens the form for this gig', () => {
    mount();
    fireEvent.press(screen.getByTestId('gig-edit'));
    expect(mockNavigate).toHaveBeenCalledWith('GigJobForm', { id: 'g1' });
  });

  it('asks before closing an open gig, and closes nothing yet', () => {
    mount();
    expect(screen.getByText('gigJobs.detail.close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('gig-toggle-status'));
    expect(screen.getByText('gigJobs.detail.closeConfirmTitle')).toBeOnTheScreen();
    expect(request).not.toHaveBeenCalled();
  });

  it('closes the gig once confirmed, hands up the answer and says it saved', async () => {
    request.mockResolvedValue({ setGigJobStatus: jobOf({ is_mine: true, status: 'CLOSED' }) });
    const onChanged = mount();
    fireEvent.press(screen.getByTestId('gig-toggle-status'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-close-confirm-confirm'));
    });
    expect(request).toHaveBeenCalledWith(
      SetGigJobStatusDocument,
      { id: 'g1', status: GigJobStatus.Closed },
      AUTH,
    );
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'CLOSED' }));
    expect(await screen.findByTestId('gig-status-notice')).toHaveTextContent(
      'gigJobs.detail.statusSaved',
    );
    await waitFor(() => expect(screen.queryByText('gigJobs.detail.closeConfirmTitle')).toBeNull());
  });

  it('keeps the gig open when the owner backs out of the confirmation', async () => {
    mount();
    fireEvent.press(screen.getByTestId('gig-toggle-status'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-close-confirm-cancel'));
    });
    expect(request).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('gigJobs.detail.closeConfirmTitle')).toBeNull());
  });

  it('reopens a closed gig straight away, without asking', async () => {
    request.mockResolvedValue({ setGigJobStatus: jobOf({ is_mine: true, status: 'OPEN' }) });
    const onChanged = mount(jobOf({ is_mine: true, status: 'CLOSED' }));
    expect(screen.getByText('gigJobs.detail.reopen')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-toggle-status'));
    });
    expect(request).toHaveBeenCalledWith(
      SetGigJobStatusDocument,
      { id: 'g1', status: GigJobStatus.Open },
      AUTH,
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('gigJobs.detail.closeConfirmTitle')).toBeNull();
  });

  it('says the status change failed and hands nothing up', async () => {
    request.mockRejectedValue(new Error('offline'));
    const onChanged = mount();
    fireEvent.press(screen.getByTestId('gig-toggle-status'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-close-confirm-confirm'));
    });
    expect(await screen.findByTestId('gig-status-notice')).toHaveTextContent(
      'gigJobs.detail.statusFailed',
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows no notice before anything happened', () => {
    mount();
    expect(screen.queryByTestId('gig-status-notice')).toBeNull();
  });
});

describe('GigViewerActions', () => {
  const mount = (job: GigJob, viewer: { is_freelancer: boolean } | null) => {
    const onChanged = jest.fn();
    renderWithProviders(<GigViewerActions job={job} viewer={viewer} onChanged={onChanged} />);
    return onChanged;
  };

  it('gives the poster their own controls', () => {
    mount(jobOf({ is_mine: true }), { is_freelancer: false });
    expect(screen.getByTestId('gig-edit')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-toggle-status')).toBeOnTheScreen();
  });

  it('shows nothing to a freelancer who already shared their contact, until they do it now', () => {
    mount(jobOf({ viewer_interested: true }), { is_freelancer: true });
    expect(screen.queryByTestId('gig-interest-sent')).toBeNull();
    expect(screen.queryByTestId('gig-interest-open')).toBeNull();
  });

  it('says the gig is closed to someone who cannot act on a closed gig', () => {
    mount(jobOf({ status: 'CLOSED' }), { is_freelancer: true });
    expect(screen.getByTestId('gig-closed')).toHaveTextContent('gigJobs.detail.closed');
  });

  it('sends a member who is not a freelancer to join first', () => {
    mount(jobOf(), { is_freelancer: false });
    expect(screen.getByTestId('gig-join-hint')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('gig-join-freelancer'));
    expect(mockNavigate).toHaveBeenCalledWith('FreelancerProfile');
  });

  it('treats a viewer who has not loaded yet as not a freelancer', () => {
    mount(jobOf(), null);
    expect(screen.getByTestId('gig-join-freelancer')).toBeOnTheScreen();
  });

  it('lets a freelancer show interest, and confirms once contacts are swapped', async () => {
    request.mockResolvedValue({ expressGigInterest: jobOf({ viewer_interested: true }) });
    const onChanged = mount(jobOf(), { is_freelancer: true });
    fireEvent.press(screen.getByTestId('gig-interest-open'));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('gig-interest-submit'));
    });
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ viewer_interested: true })),
    );
  });
  it('confirms the share once the gig comes back carrying the swapped contact', async () => {
    request.mockResolvedValue({ expressGigInterest: jobOf({ viewer_interested: true }) });
    const onChanged = jest.fn();
    const view = renderWithProviders(
      <GigViewerActions job={jobOf()} viewer={{ is_freelancer: true }} onChanged={onChanged} />,
    );
    fireEvent.press(screen.getByTestId('gig-interest-open'));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('gig-interest-submit'));
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    view.rerender(
      <GigViewerActions
        job={jobOf({ viewer_interested: true })}
        viewer={{ is_freelancer: true }}
        onChanged={onChanged}
      />,
    );
    expect(screen.getByTestId('gig-interest-sent')).toHaveTextContent(/gigJobs.interest.sent/);
  });

  it('closes the interest sheet without sharing anything', async () => {
    mount(jobOf(), { is_freelancer: true });
    fireEvent.press(screen.getByTestId('gig-interest-open'));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('gig-interest-cancel'));
    });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('InterestSheet', () => {
  const mount = (open = true) => {
    const handlers = { onClose: jest.fn(), onShared: jest.fn() };
    renderWithProviders(<InterestSheet job={jobOf()} open={open} {...handlers} />);
    return handlers;
  };
  const submit = async () =>
    act(async () => {
      fireEvent.press(screen.getByTestId('gig-interest-submit'));
    });

  it('names the poster, explains what is shared and notes that sharing is free for now', () => {
    mount();
    expect(screen.getByText('gigJobs.interest.dialogTitle|Asha')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.interest.dialogBody')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-contact-notice')).toBeOnTheScreen();
  });

  it('draws nothing while closed', () => {
    mount(false);
    expect(screen.queryByText('gigJobs.interest.dialogBody')).toBeNull();
  });

  it('shares with the typed note, trimmed, hands up the gig and closes', async () => {
    const shared = jobOf({ viewer_interested: true });
    request.mockResolvedValue({ expressGigInterest: shared });
    const { onShared, onClose } = mount();
    fireEvent.changeText(
      screen.getByLabelText('gigJobs.interest.messageLabel'),
      '  I can do Saturday  ',
    );
    await submit();
    await waitFor(() => expect(onShared).toHaveBeenCalledWith(shared));
    expect(request).toHaveBeenCalledWith(
      ExpressGigInterestDocument,
      { job_id: 'g1', message: 'I can do Saturday' },
      AUTH,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shares with no note at all', async () => {
    request.mockResolvedValue({ expressGigInterest: jobOf() });
    const { onShared } = mount();
    await submit();
    await waitFor(() => expect(onShared).toHaveBeenCalled());
    expect(request.mock.calls[0][1]).toEqual({ job_id: 'g1', message: '' });
  });

  it('refuses a note over the limit and shares nothing', async () => {
    const { onShared } = mount();
    fireEvent.changeText(screen.getByLabelText('gigJobs.interest.messageLabel'), 'x'.repeat(2000));
    await submit();
    expect(await screen.findByText(/gigJobs.validation.tooLong/)).toBeOnTheScreen();
    expect(request).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('shows the server reason when sharing fails and stays open', async () => {
    request.mockRejectedValue({ errors: [{ message: 'This gig is closed' }] });
    const { onShared, onClose } = mount();
    await submit();
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(onShared).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels without sharing', async () => {
    const { onClose } = mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-interest-cancel'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it('cannot be dismissed from the dialog close while the share is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { onClose } = mount();
    await submit();
    for (const control of screen.getAllByLabelText('gigJobs.form.cancel')) fireEvent.press(control);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish({ expressGigInterest: jobOf() }));
  });
});

describe('GigInterestsList', () => {
  const interest = (id: string, patch: Record<string, unknown> = {}) => ({
    id,
    freelancer_name: `Freelancer ${id}`,
    skills: ['DJ', 'MC'],
    message: 'Available all month',
    contact: { name: 'Ravi', phone: '+91 99999 00000', email: 'ravi@x.com' },
    created_at: '2026-10-01T10:00:00Z',
    ...patch,
  });

  it('shows a spinner until the interests arrive', () => {
    request.mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<GigInterestsList jobId="g1" />);
    expect(screen.getByRole('heading', { name: 'gigJobs.interests.title' })).toBeOnTheScreen();
    expect(screen.queryByText('gigJobs.interests.empty')).toBeNull();
  });

  it('lists each freelancer with their contact, skills and message', async () => {
    request.mockResolvedValue({
      gigJobInterests: [interest('i1'), interest('i2', { skills: [], message: '' })],
    });
    renderWithProviders(<GigInterestsList jobId="g1" />);
    expect(await screen.findByText('Freelancer i1')).toBeOnTheScreen();
    expect(request).toHaveBeenCalledWith(GigJobInterestsDocument, { job_id: 'g1' }, AUTH);
    expect(screen.getByText('Freelancer i2')).toBeOnTheScreen();
    expect(screen.getAllByText('DJ')).toHaveLength(1);
    expect(screen.getByText('Available all month')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-interest-i1-call')).toBeOnTheScreen();
  });

  it('says nobody has shown interest yet', async () => {
    request.mockResolvedValue({ gigJobInterests: [] });
    renderWithProviders(<GigInterestsList jobId="g1" />);
    expect(await screen.findByText('gigJobs.interests.empty')).toBeOnTheScreen();
  });

  it('says the load failed', async () => {
    request.mockRejectedValue(new Error('offline'));
    renderWithProviders(<GigInterestsList jobId="g1" />);
    expect(await screen.findByText('gigJobs.interests.loadFailed')).toBeOnTheScreen();
  });
});
