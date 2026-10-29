import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CompletePodDialog, {
  buildCompleteInput,
  buildCompleteSchema,
  mediaTextToInput,
} from '../complete-pod.form';
import type { CompletePodValues } from '../complete-pod.types';

// The real picker opens a library over the network. A plain field that edits
// the same newline-separated string is all the dialog's own logic needs; the
// picker has its own suite in @duncit/media-picker.
vi.mock('@duncit/media-picker', () => ({
  MediaListField: (props: {
    label: string;
    value: string;
    helperText?: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {props.label}
      <textarea
        aria-label={props.label}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <span>{props.helperText}</span>
    </label>
  ),
}));

// SettlementPreview runs its own GraphQL query and has its own suite; here it
// only has to show what the dialog hands it — and, like the real one once its
// settlement loads, say whether the agreed offer was a free venue (the pod id
// 'pod-free-venue' stands in for one).
vi.mock('../SettlementPreview', async () => {
  const { useEffect } = await import('react');
  return {
    default: (props: {
      podId: string;
      venueBillAmount: number;
      venueExtraAmount: number;
      hostUserId: string;
      free?: boolean;
      onFreeVenue?: (freeVenue: boolean) => void;
    }) => {
      const { podId, onFreeVenue } = props;
      useEffect(() => {
        onFreeVenue?.(podId === 'pod-free-venue');
      }, [podId, onFreeVenue]);
      return (
        <div data-testid="preview" data-free={String(props.free)}>
          {`${props.podId}|${props.venueBillAmount}|${props.venueExtraAmount}|${props.hostUserId}`}
        </div>
      );
    },
  };
});

const VENUE_POD = {
  id: 'pod-1',
  pod_title: 'Sunday Brunch',
  venue_id: 'venue-1',
  pod_hosts_id: ['u1', 'u2', 'u3', 'u4'],
};

const USERS = [
  { user_id: 'u1', full_name: 'Jane Doe', email: 'jane@example.com' },
  { user_id: 'u2', full_name: '', email: 'raj@example.com' },
  { user_id: 'u3', full_name: '', email: '' },
];

const renderDialog = (over: Partial<Parameters<typeof CompletePodDialog>[0]> = {}) => {
  // Kept apart from `props` so its calls stay typed as a mock's.
  const onSubmit = vi.fn<(values: CompletePodValues) => void>();
  const props = {
    open: true,
    pod: VENUE_POD,
    users: USERS,
    busy: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit,
    ...over,
  };
  return { ...render(<CompletePodDialog {...props} />), props, onSubmit };
};

const MEDIA = 'https://cdn.test/party.jpg';
// The shell's real words for the two bill rules (shell.venueBill.*).
const BILL_REQUIRED = "Enter the total on the venue's final bill";
const BILL_UPLOAD_REQUIRED = "Upload the venue's final bill";

describe('CompletePodDialog / rendering', () => {
  it('names the pod, preselects the first host and quotes the settlement for them', () => {
    renderDialog();
    expect(screen.getByText('Sunday Brunch')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /host/i })).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|0|0|u1');
  });

  it('lists each host by name, falling back to email, then the id, and the id alone for an unknown user', () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /host/i }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Jane Doe',
      'raj@example.com',
      'u3',
      // Not in the users list at all: the bare id is all there is.
      'u4',
    ]);
  });

  it('shows no venue bill section and no preview for a virtual pod', () => {
    renderDialog({ pod: { ...VENUE_POD, venue_id: null } });
    expect(screen.queryByText(/venue bill/i)).not.toBeInTheDocument();
    // The preview still renders — it is keyed on the pod, not the venue.
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  // A free pod's host settles the venue directly: even at a venue, no bill.
  it('asks for no venue bill on a free pod at a venue and tells the preview it is free', () => {
    renderDialog({ pod: { ...VENUE_POD, pod_type: 'FREE' } });
    expect(screen.queryByText(/venue bill/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('preview')).toHaveAttribute('data-free', 'true');
  });

  it('keeps the venue bill on a paid pod at a venue', () => {
    renderDialog({ pod: { ...VENUE_POD, pod_type: 'PAID' } });
    expect(screen.getAllByText(/venue bill/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('preview')).toHaveAttribute('data-free', 'false');
  });

  it('renders no preview and no host before a pod is chosen', () => {
    renderDialog({ pod: null });
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /host/i })).toBeInTheDocument();
  });

  it('shows the server error above the form', () => {
    renderDialog({ errorMessage: 'Pod already completed' });
    expect(screen.getByRole('alert')).toHaveTextContent('Pod already completed');
  });

  it('shows the in-flight label and cannot be dismissed while busy', () => {
    const { props } = renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: /completing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes from the Close button when idle', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

const billTotal = () => screen.getByRole('spinbutton', { name: /venue final bill total/i });
const extraCharges = () => screen.getByRole('spinbutton', { name: /extra charges/i });

describe('CompletePodDialog / venue bill', () => {
  // The bill is the proof of the agreed amount: its total, the file and any
  // extra charges are all asked up front, and the slot-price choice is gone.
  it('asks for the bill total, the bill itself and the extra charges, with no slot-price choice', () => {
    renderDialog();
    expect(billTotal()).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Upload the venue bill' })).toBeInTheDocument();
    expect(extraCharges()).not.toBeRequired();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('previews the typed bill total and extra charges', () => {
    renderDialog();
    fireEvent.change(billTotal(), { target: { value: '1500' } });
    fireEvent.change(extraCharges(), { target: { value: '250' } });
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|1500|250|u1');
  });

  it('previews a negative bill as no bill and out-of-range extras as none', () => {
    renderDialog();
    fireEvent.change(billTotal(), { target: { value: '-40' } });
    fireEvent.change(extraCharges(), { target: { value: '-5' } });
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|0|0|u1');
  });
});

describe('CompletePodDialog / submit', () => {
  it('refuses to submit without party media and says so', async () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));
    expect(await screen.findByText(/party/i)).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('demands the bill total and the bill itself on a paid venue pod', async () => {
    const { props } = renderDialog();
    const [, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    expect(await screen.findByText(BILL_REQUIRED)).toBeInTheDocument();
    expect(screen.getByText(BILL_UPLOAD_REQUIRED)).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  // A free pod's host settles the venue directly, and a pod with no venue has none.
  it.each([
    ['a free pod at a venue', { ...VENUE_POD, pod_type: 'FREE' }],
    ['a pod with no venue', { ...VENUE_POD, venue_id: null }],
  ])('completes %s with no venue bill', async (_name, pod) => {
    const { props, onSubmit } = renderDialog({ pod });
    const [mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ venue_bill_amount: '', venue_bill_media: '' });
  });

  it('demands the uploaded bill when its total is entered', async () => {
    const { props } = renderDialog();
    fireEvent.change(billTotal(), { target: { value: '1500' } });
    // Bill upload comes first in the form, party media second.
    const [, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    expect(await screen.findByText(BILL_UPLOAD_REQUIRED)).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('refuses extra charges outside the server bound', async () => {
    const { props } = renderDialog();
    fireEvent.change(billTotal(), { target: { value: '1500' } });
    fireEvent.change(extraCharges(), { target: { value: '1000001' } });
    const [billField, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(billField, { target: { value: 'https://cdn.test/bill.pdf' } });
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    expect(await screen.findByText('Enter the extra charges as an amount from 0 to 1000000')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed values once the bill and media are present', async () => {
    const { props, onSubmit } = renderDialog();
    fireEvent.change(billTotal(), { target: { value: '1500' } });
    fireEvent.change(extraCharges(), { target: { value: '250' } });
    const [billField, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    const bill = 'https://cdn.test/bill.pdf';
    fireEvent.change(billField, { target: { value: bill } });
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      host_user_id: 'u1',
      venue_bill_amount: '1500',
      venue_bill_media: bill,
      venue_extra_amount: '250',
      media_text: MEDIA,
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('include_slot_price');
  });

  // A free venue is owed nothing for the booking, so its bill proves only the extras it charged.
  describe('at a free venue', () => {
    const FREE_VENUE_POD = { ...VENUE_POD, id: 'pod-free-venue' };
    const HINT = 'Free venue — upload its bill only if it charged extra.';

    it('completes with no bill when the venue charged nothing extra, and says why', async () => {
      const { onSubmit } = renderDialog({ pod: FREE_VENUE_POD });
      expect(await screen.findByText(HINT)).toBeInTheDocument();
      expect(billTotal()).not.toBeRequired();
      const [, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
      fireEvent.change(mediaField, { target: { value: MEDIA } });
      fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ venue_bill_amount: '', venue_bill_media: '' });
    });

    it('still demands the bill once the venue charged extra', async () => {
      const { onSubmit } = renderDialog({ pod: FREE_VENUE_POD });
      await screen.findByText(HINT);
      fireEvent.change(extraCharges(), { target: { value: '300' } });
      const [, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
      fireEvent.change(mediaField, { target: { value: MEDIA } });
      fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

      expect(await screen.findByText(BILL_REQUIRED)).toBeInTheDocument();
      expect(screen.getByText(BILL_UPLOAD_REQUIRED)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('starts clean for the next pod rather than keeping what was typed for the last', () => {
    const { rerender, props } = renderDialog();
    fireEvent.change(billTotal(), { target: { value: '900' } });
    expect(billTotal()).toHaveValue(900);

    rerender(<CompletePodDialog {...props} pod={{ ...VENUE_POD, id: 'pod-2', pod_hosts_id: ['u2'] }} />);

    expect(billTotal()).toHaveValue(null);
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-2|0|0|u2');
  });
});

describe('buildCompleteSchema / buildCompleteInput / mediaTextToInput', () => {
  const t = (key: string) => key;
  const values = (over: Partial<CompletePodValues> = {}): CompletePodValues => ({
    host_user_id: 'u1',
    venue_bill_amount: '1500',
    venue_bill_media: 'https://cdn.test/bill.pdf',
    venue_extra_amount: '',
    venue_pax: '',
    overtime_hours: '',
    media_text: MEDIA,
    notes: '',
    ...over,
  });
  const messages = (hasVenue: boolean, input: CompletePodValues) => {
    const parsed = buildCompleteSchema(hasVenue, t).safeParse(input);
    return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
  };

  it('requires a host, party media and keeps notes to 1000 characters', () => {
    expect(messages(true, values({ host_user_id: '  ' }))).toEqual(['admin.completePod.selectHost']);
    expect(messages(true, values({ media_text: ' ' }))).toEqual(['admin.completePod.mediaRequired']);
    expect(messages(true, values({ notes: 'x'.repeat(1001) }))).toEqual([
      'admin.completePod.notesTooLong',
    ]);
    expect(messages(true, values({ notes: 'x'.repeat(1000) }))).toEqual([]);
  });

  it('requires the bill total and the bill itself on a paid venue pod', () => {
    expect(messages(true, values({ venue_bill_amount: '', venue_bill_media: '' }))).toEqual([
      'shell.venueBill.billRequired',
      'shell.venueBill.billUploadRequired',
    ]);
    expect(messages(true, values({ venue_bill_media: ' \n ' }))).toEqual(['shell.venueBill.billUploadRequired']);
  });

  it('rejects a bill total of zero, below zero or not a number', () => {
    for (const venue_bill_amount of ['0', '-1', 'abc']) {
      expect(messages(true, values({ venue_bill_amount }))).toEqual(['shell.venueBill.amountInvalid']);
    }
  });

  it('checks the extra charges against the server bound', () => {
    expect(messages(true, values({ venue_extra_amount: '1000000' }))).toEqual([]);
    expect(messages(true, values({ venue_extra_amount: '-1' }))).toEqual(['shell.venueBill.extraInvalid']);
    expect(messages(true, values({ venue_extra_amount: '1000000.5' }))).toEqual(['shell.venueBill.extraInvalid']);
  });

  // A free venue is owed nothing for the booking: its bill is asked for only once extras or a bill are entered.
  it('asks a free venue for its bill only with extras, or once a bill is entered', () => {
    const freeVenue = (input: CompletePodValues) => {
      const parsed = buildCompleteSchema(true, t, true).safeParse(input);
      return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    };
    const noBill = { venue_bill_amount: '', venue_bill_media: '' };
    expect(freeVenue(values(noBill))).toEqual([]);
    expect(freeVenue(values({ ...noBill, venue_extra_amount: '0' }))).toEqual([]);
    expect(freeVenue(values({ ...noBill, venue_extra_amount: '300' }))).toEqual([
      'shell.venueBill.billRequired',
      'shell.venueBill.billUploadRequired',
    ]);
    expect(freeVenue(values({ venue_bill_media: '' }))).toEqual(['shell.venueBill.billUploadRequired']);
    expect(freeVenue(values())).toEqual([]);
  });

  // A pod with no venue, or a free one, owes no venue bill at all.
  it('asks nothing of the venue fields when there is no bill to ask for', () => {
    expect(
      messages(false, values({ venue_bill_amount: '', venue_bill_media: '', venue_extra_amount: '-1', venue_pax: '2.5' })),
    ).toEqual([]);
  });

  it('checks the venue usage on a venue pod and sends what was entered', () => {
    expect(messages(true, values({ venue_pax: '2.5', overtime_hours: '60' }))).toEqual([
      'shell.venueBill.paxInvalid',
      'shell.venueBill.overtimeInvalid',
    ]);
    expect(buildCompleteInput(values({ venue_pax: '22', overtime_hours: '2' }), 'pod-9')).toMatchObject({
      venue_pax: 22,
      overtime_hours: 2,
    });
    expect(buildCompleteInput(values(), 'pod-9')).not.toHaveProperty('venue_pax');
  });

  // Extra charges always go with a bill (0 included) and the slot-price choice never does.
  it('maps a bill, its file and the extra charges onto the server input', () => {
    const input = buildCompleteInput(values({ venue_extra_amount: '250', notes: ' Paid ' }), 'pod-9');
    expect(input).toEqual({
      pod_id: 'pod-9',
      host_user_id: 'u1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn.test/bill.pdf',
      venue_extra_amount: 250,
      evidence_media: [{ url: MEDIA, type: 'IMAGE' }],
      notes: 'Paid',
    });
    expect(buildCompleteInput(values(), 'pod-9')).toMatchObject({ venue_extra_amount: 0 });
    expect(input).not.toHaveProperty('include_slot_price');
  });

  it('drops the bill file, extra charges, blank host and blank notes when there is no bill behind them', () => {
    const input = buildCompleteInput(
      values({ venue_bill_amount: '', venue_extra_amount: '250', host_user_id: '', notes: '  ' }),
      'pod-9',
    );
    expect(input).toMatchObject({ venue_bill_amount: 0, host_user_id: undefined, notes: undefined });
    expect(input).not.toHaveProperty('venue_bill_url');
    expect(input).not.toHaveProperty('venue_extra_amount');
    expect(input).not.toHaveProperty('include_slot_price');
  });

  it('reads an unparseable amount as 0 rather than NaN', () => {
    expect(buildCompleteInput(values({ venue_bill_amount: 'abc' }), 'pod-9').venue_bill_amount).toBe(0);
  });

  it('types evidence by extension and skips blank lines', () => {
    expect(
      mediaTextToInput(' https://cdn.test/a.jpg \n\n https://cdn.test/b.MP4?x=1\nhttps://cdn.test/c.webm'),
    ).toEqual([
      { url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
      { url: 'https://cdn.test/b.MP4?x=1', type: 'VIDEO' },
      { url: 'https://cdn.test/c.webm', type: 'VIDEO' },
    ]);
    expect(mediaTextToInput('')).toEqual([]);
  });
});
