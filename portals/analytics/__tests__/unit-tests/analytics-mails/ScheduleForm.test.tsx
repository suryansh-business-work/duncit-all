import { describe, expect, it, vi } from 'vitest';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AnalyticsMailScheduleForm } from '../../../src/pages/analytics-mails/analytics-mail-schedule';
import type { AnalyticsMailSettings } from '../../../src/pages/analytics-mails/queries';
import { byTestId, click, mount, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';

const settings = (over: Partial<AnalyticsMailSettings> = {}): AnalyticsMailSettings => ({
  __typename: 'AnalyticsMailSettings',
  enabled: true,
  time_of_day: '09:00',
  weekday: 1,
  time_zone: 'Asia/Kolkata',
  ...over,
});

const render = async (value: AnalyticsMailSettings) => {
  const onSubmit = vi.fn();
  await mount(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnalyticsMailScheduleForm settings={value} busy={false} onSubmit={onSubmit} />
    </LocalizationProvider>,
  );
  return onSubmit;
};

describe('AnalyticsMailScheduleForm', () => {
  it('shows where the send time is read, and submits a valid schedule as it is', async () => {
    const onSubmit = await render(settings());
    expect(document.body.textContent).toContain(COPY['analytics.mails.sendAtHint'].replace('{zone}', 'Asia/Kolkata'));
    await click(byTestId('analytics-mail-schedule-save'));
    await waitUntil(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ enabled: true, time_of_day: '09:00', weekday: 1 });
  });

  it('names a stored send time that is not HH:mm instead of submitting it', async () => {
    const onSubmit = await render(settings({ time_of_day: '9.5' }));
    await click(byTestId('analytics-mail-schedule-save'));
    await waitUntil(() => expect(document.body.textContent).toContain(COPY['analytics.mails.timeFormat']));
    expect(document.body.textContent).not.toContain(COPY['analytics.mails.sendAtHint'].replace('{zone}', 'Asia/Kolkata'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
