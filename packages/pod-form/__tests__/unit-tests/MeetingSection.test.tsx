import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import MeetingSection from '../../src/sections/MeetingSection';
import { Harness, makeData } from './helpers';
import type { PodFormData, PodFormValues, PodOption } from '../../src/types';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: any) => <span>picker:{label}</span>,
}));

const PLATFORMS: PodOption[] = [
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'OTHER', label: 'Other' },
];

function renderMeeting(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <MeetingSection />
    </Harness>,
  );
  return methodsRef;
}

describe('MeetingSection', () => {
  it('renders a plain platform text field without platform options', async () => {
    const user = userEvent.setup();
    renderMeeting(makeData());
    const platform = screen.getByLabelText(/Meeting platform/);
    await user.type(platform, 'Custom');
    expect(platform).toHaveValue('Custom');
    expect(screen.getByText('picker:Start date & time')).toBeInTheDocument();
  });

  it('renders a platform select and sets the chosen platform', async () => {
    const user = userEvent.setup();
    const ref = renderMeeting(makeData({ meetingPlatforms: PLATFORMS }));
    await user.click(screen.getByLabelText(/Meeting platform/));
    await user.click(await screen.findByRole('option', { name: 'Zoom' }));
    expect(ref.current?.getValues('meeting_platform')).toBe('ZOOM');
  });

  it('auto-generates a meeting link with the pod title and end time', async () => {
    const user = userEvent.setup();
    const onGenerateMeetingLink = vi.fn().mockResolvedValue('https://meet/generated');
    const ref = renderMeeting(
      makeData({ meetingPlatforms: PLATFORMS, onGenerateMeetingLink }),
      {
        meeting_platform: 'ZOOM',
        pod_title: 'Chess',
        pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
        pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
      },
    );
    await user.click(screen.getByText('Generate'));
    expect(onGenerateMeetingLink).toHaveBeenCalledWith({
      platform: 'ZOOM',
      title: 'Chess',
      startISO: '2030-06-01T10:00:00.000Z',
      endISO: '2030-06-01T12:00:00.000Z',
    });
    expect(ref.current?.getValues('meeting_url')).toBe('https://meet/generated');
  });

  it('defaults the title and omits the end time when they are unset', async () => {
    const user = userEvent.setup();
    const onGenerateMeetingLink = vi.fn().mockResolvedValue('https://meet/x');
    renderMeeting(
      makeData({ meetingPlatforms: PLATFORMS, onGenerateMeetingLink }),
      { meeting_platform: 'ZOOM', pod_date_time: new Date('2030-06-01T10:00:00.000Z') },
    );
    await user.click(screen.getByText('Generate'));
    expect(onGenerateMeetingLink).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Duncit Pod', endISO: undefined }),
    );
  });

  it('surfaces a generation error', async () => {
    const user = userEvent.setup();
    const onGenerateMeetingLink = vi.fn().mockRejectedValue(new Error('rate limited'));
    renderMeeting(
      makeData({ meetingPlatforms: PLATFORMS, onGenerateMeetingLink }),
      { meeting_platform: 'ZOOM', pod_date_time: new Date('2030-06-01T10:00:00.000Z') },
    );
    await user.click(screen.getByText('Generate'));
    expect(await screen.findByText('rate limited')).toBeInTheDocument();
  });

  it('hides the generate button when no start date/time is set', () => {
    const onGenerateMeetingLink = vi.fn();
    renderMeeting(makeData({ meetingPlatforms: PLATFORMS, onGenerateMeetingLink }), {
      meeting_platform: 'ZOOM',
      pod_date_time: null,
    });
    expect(screen.queryByText('Generate')).not.toBeInTheDocument();
  });

  it('shows platform and notes validation errors', () => {
    const ref = renderMeeting(makeData({ meetingPlatforms: PLATFORMS }), { meeting_platform: 'ZOOM' });
    act(() => {
      ref.current?.setError('meeting_platform', { type: 'custom', message: 'Platform too long' });
      ref.current?.setError('meeting_notes', { type: 'custom', message: 'Notes too long' });
    });
    expect(screen.getByText('Platform too long')).toBeInTheDocument();
    expect(screen.getByText('Notes too long')).toBeInTheDocument();
  });

  it('shows the platform error on the plain text field and the meeting-link error', () => {
    const ref = renderMeeting(makeData());
    act(() => {
      ref.current?.setError('meeting_platform', { type: 'custom', message: 'Platform bad' });
      ref.current?.setError('meeting_url', { type: 'custom', message: 'Meeting link is required' });
    });
    expect(screen.getByText('Platform bad')).toBeInTheDocument();
    expect(screen.getByText('Meeting link is required')).toBeInTheDocument();
  });

  it('falls back to a default message when the generation error has no message', async () => {
    const user = userEvent.setup();
    // reject with a value that has no `message`
    const onGenerateMeetingLink = vi.fn().mockRejectedValue({ code: 500 });
    renderMeeting(
      makeData({ meetingPlatforms: PLATFORMS, onGenerateMeetingLink }),
      { meeting_platform: 'ZOOM', pod_date_time: new Date('2030-06-01T10:00:00.000Z') },
    );
    await user.click(screen.getByText('Generate'));
    expect(await screen.findByText('Could not generate meeting link')).toBeInTheDocument();
  });
});
