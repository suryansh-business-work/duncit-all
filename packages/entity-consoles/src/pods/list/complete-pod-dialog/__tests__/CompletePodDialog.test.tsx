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
// only has to show what the dialog hands it.
vi.mock('../SettlementPreview', () => ({
  default: (props: {
    podId: string;
    venueBillAmount: number;
    includeSlotPrice: boolean;
    hostUserId: string;
    free?: boolean;
  }) => (
    <div data-testid="preview" data-free={String(props.free)}>
      {`${props.podId}|${props.venueBillAmount}|${props.includeSlotPrice}|${props.hostUserId}`}
    </div>
  ),
}));

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
  const props = {
    open: true,
    pod: VENUE_POD,
    users: USERS,
    busy: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    ...over,
  };
  return { ...render(<CompletePodDialog {...props} />), props };
};

const MEDIA = 'https://cdn.test/party.jpg';

describe('CompletePodDialog / rendering', () => {
  it('names the pod, preselects the first host and quotes the settlement for them', () => {
    renderDialog();
    expect(screen.getByText('Sunday Brunch')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /host/i })).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|0|false|u1');
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

describe('CompletePodDialog / venue bill', () => {
  it('asks for the bill document and the slot-price choice only once an amount is typed', () => {
    renderDialog();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1500' } });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|1500|true|u1');
  });

  it('forgets the slot-price choice again when the amount goes back to zero', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|0|false|u1');
  });

  it('treats a negative or unreadable amount as no bill for the preview', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '-40' } });
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-1|0|false|u1');
  });
});

describe('CompletePodDialog / submit', () => {
  it('refuses to submit without party media and says so', async () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));
    expect(await screen.findByText(/party/i)).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('demands the uploaded bill when an amount is entered', async () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1500' } });
    // Bill upload comes first in the form, party media second.
    const [, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    expect(await screen.findByText('Upload the venue bill for the amount you entered')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed values once the bill and media are present', async () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1500' } });
    const [billField, mediaField] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    const bill = 'https://cdn.test/bill.pdf';
    fireEvent.change(billField, { target: { value: bill } });
    fireEvent.change(mediaField, { target: { value: MEDIA } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete pod' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit.mock.calls[0][0]).toMatchObject({
      host_user_id: 'u1',
      venue_bill_amount: 1500,
      venue_bill_media: bill,
      include_slot_price: false,
      media_text: MEDIA,
    });
  });

  it('starts clean for the next pod rather than keeping what was typed for the last', () => {
    const { rerender, props } = renderDialog();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '900' } });
    expect(screen.getByRole('spinbutton')).toHaveValue(900);

    rerender(<CompletePodDialog {...props} pod={{ ...VENUE_POD, id: 'pod-2', pod_hosts_id: ['u2'] }} />);

    expect(screen.getByRole('spinbutton')).toHaveValue(0);
    expect(screen.getByTestId('preview')).toHaveTextContent('pod-2|0|false|u2');
  });
});

describe('buildCompleteSchema / buildCompleteInput / mediaTextToInput', () => {
  const t = (key: string) => key;
  const values = (over: Partial<CompletePodValues> = {}): CompletePodValues => ({
    host_user_id: 'u1',
    venue_bill_amount: 1500,
    venue_bill_media: 'https://cdn.test/bill.pdf',
    include_slot_price: false,
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

  it('rejects a negative or non-numeric amount', () => {
    expect(messages(true, values({ venue_bill_amount: -1 }))).toEqual(['admin.completePod.invalidAmount']);
    expect(messages(true, values({ venue_bill_amount: 'abc' as unknown as number }))).toEqual([
      'admin.completePod.invalidAmount',
    ]);
  });

  it('asks for the bill document only for a venue pod with an amount', () => {
    expect(messages(true, values({ venue_bill_media: '' }))).toEqual(['shell.venueBill.uploadRequired']);
    expect(messages(false, values({ venue_bill_media: '' }))).toEqual([]);
    expect(messages(true, values({ venue_bill_amount: 0, venue_bill_media: '' }))).toEqual([]);
  });

  it('checks the venue usage on a venue pod and sends what was entered', () => {
    expect(messages(true, values({ venue_pax: '2.5', overtime_hours: '60' }))).toEqual([
      'shell.venueBill.paxInvalid',
      'shell.venueBill.overtimeInvalid',
    ]);
    // A pod with no venue has no usage to price.
    expect(messages(false, values({ venue_pax: '2.5' }))).toEqual([]);
    expect(buildCompleteInput(values({ venue_pax: '22', overtime_hours: '2' }), 'pod-9')).toMatchObject({
      venue_pax: 22,
      overtime_hours: 2,
    });
    expect(buildCompleteInput(values(), 'pod-9')).not.toHaveProperty('venue_pax');
  });

  it('maps a bill, its file and the slot-price choice onto the server input', () => {
    expect(buildCompleteInput(values({ include_slot_price: true, notes: ' Paid ' }), 'pod-9')).toEqual({
      pod_id: 'pod-9',
      host_user_id: 'u1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn.test/bill.pdf',
      include_slot_price: true,
      evidence_media: [{ url: MEDIA, type: 'IMAGE' }],
      notes: 'Paid',
    });
  });

  it('drops the bill file, slot choice, blank host and blank notes when there is nothing behind them', () => {
    const input = buildCompleteInput(
      values({ venue_bill_amount: 0, include_slot_price: true, host_user_id: '', notes: '  ' }),
      'pod-9',
    );
    expect(input).toMatchObject({
      venue_bill_amount: 0,
      venue_bill_url: undefined,
      include_slot_price: undefined,
      host_user_id: undefined,
      notes: undefined,
    });
  });

  it('reads an unparseable amount as 0 rather than NaN', () => {
    expect(buildCompleteInput(values({ venue_bill_amount: Number.NaN }), 'pod-9').venue_bill_amount).toBe(0);
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
