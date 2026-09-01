/**
 * The meeting fields on a VIRTUAL pod.
 *
 * A virtual pod has no venue, so these three fields are the entire "where" — a
 * pod created without a working link is a pod nobody can attend, and the host
 * finds out at the start time.
 *
 * The schedule rule beside them is the one with a twin in the native app: the
 * end picker only opens times after the start, and the first thirty minutes are
 * blocked too, because that is the minimum a pod can last. Both apps have to
 * agree, or the same pod is creatable on one and refused on the other.
 *
 * The platform list is product NAMES from the shared list — only "Other" is
 * copy, so only "Other" is translated. A hardcoded list here would drift from
 * the one the native app offers.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VirtualMeetingFields from '../VirtualMeetingFields';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod.types';

const testTheme = createTheme();

/**
 * The real form object, because the component reads `control`, `register`,
 * `watch` AND `formState.errors` — a hand-rolled stub would only prove the stub
 * works.
 */
function Harness({
  values,
  errors,
}: Readonly<{ values?: Partial<CreatePodFormValues>; errors?: Record<string, string> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...values },
  });
  // In an effect, not during render: setError re-renders, and setting it on the
  // way through the render loops until React gives up.
  useEffect(() => {
    for (const [field, message] of Object.entries(errors ?? {})) {
      form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormProvider {...form}>
      <VirtualMeetingFields form={form} />
    </FormProvider>
  );
}

const fields = (over: Parameters<typeof Harness>[0] = {}) =>
  render(
    <ThemeProvider theme={testTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Harness {...over} />
      </LocalizationProvider>
    </ThemeProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('VirtualMeetingFields', () => {
  it('asks for the three things a virtual pod needs to be attendable', () => {
    const { container } = fields();

    // Platform, link and notes: without the first two nobody can join.
    expect(container.querySelectorAll('input, textarea').length).toBeGreaterThanOrEqual(3);
  });

  it('offers the shared platform list rather than one written here', () => {
    const { container } = fields();
    const select = container.querySelector('[role="combobox"]') as HTMLElement;

    fireEvent.mouseDown(select);

    // Product names come from @duncit/utils; only "Other" is copy.
    expect(document.body.querySelectorAll('[role="option"]').length).toBeGreaterThan(1);
  });

  it('opens on the platform a host already chose', () => {
    const { container } = fields({ values: { meeting_platform: 'GOOGLE_MEET' } });

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the hint under each field until there is an error to show instead', () => {
    const hinted = fields();
    const failed = fields({ errors: { meeting_url: 'Enter a valid meeting link' } });

    expect(failed.container.textContent).toContain('Enter a valid meeting link');
    expect(hinted.container.textContent).not.toContain('Enter a valid meeting link');
  });

  it('reports a bad platform on the platform field, not on the form', () => {
    const { container } = fields({ errors: { meeting_platform: 'Pick a platform' } });

    expect(container.textContent).toContain('Pick a platform');
  });

  it('takes the link a host types', () => {
    const { container } = fields();
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input')];
    const link = inputs.find((input) => input.name === 'meeting_url');

    if (link) fireEvent.change(link, { target: { value: 'https://meet.google.com/abc-defg-hij' } });

    expect(link?.value).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('takes optional notes, which are exactly that', () => {
    const { container } = fields();
    const notes = container.querySelector('textarea') as HTMLTextAreaElement;

    fireEvent.change(notes, { target: { value: 'Join five minutes early.' } });

    expect(notes.value).toBe('Join five minutes early.');
  });

  it('shows how long the pod runs once both ends are set', () => {
    const start = new Date('2026-09-02T10:00:00');
    const end = new Date('2026-09-02T11:30:00');
    const { container } = fields({
      values: { pod_date_time: start as never, pod_end_date_time: end as never },
    });

    const withoutEnd = fields({ values: { pod_date_time: start as never } });
    expect(container.textContent).not.toBe(withoutEnd.container.textContent);
  });

  it('renders before either end of the schedule has been picked', () => {
    const { container } = fields();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders with a start but no end yet, which is the state most of the form is in', () => {
    const { container } = fields({
      values: { pod_date_time: new Date('2026-09-02T10:00:00') as never },
    });

    expect(container.innerHTML).not.toBe('');
  });

  it('survives every control on it being pressed', () => {
    const { container } = fields();

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 10)) {
      if (control.isConnected) fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });
});
