import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';

// The form awaits the mutation without catching, so a failing mutation leaves a
// floating rejection (source behaviour). The UI still surfaces it via an Alert;
// swallow the specific rejection here so it doesn't fail the run.
let savedListeners: NodeJS.UnhandledRejectionListener[] = [];
const ignoreSettlementRejection = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (message.includes('Settlement failed')) return;
  savedListeners.forEach((listener) => listener(reason as Error, Promise.reject(reason).catch(() => undefined)));
};
beforeAll(() => {
  savedListeners = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', ignoreSettlementRejection);
});
afterAll(() => {
  process.removeAllListeners('unhandledRejection');
  savedListeners.forEach((listener) => process.on('unhandledRejection', listener));
});
import PodCompleteForm, {
  COMPLETE_POD,
  buildCompleteInput,
  buildPodCompleteSchema,
} from '../pod-complete.form';
import type { HostPodForComplete, PodCompleteValues } from '../pod-complete.types';

// Stub the heavy child fields (they pull in @duncit/media-picker + a picker dialog)
// with simple controlled inputs so we can drive the form's Controllers directly.
vi.mock('../BillUploadField', () => ({
  default: ({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) => (
    <div>
      <input aria-label="bill-url" value={value} onChange={(e) => onChange(e.target.value)} />
      {error ? <span>{error}</span> : null}
    </div>
  ),
}));

vi.mock('../../../create-pod-page/create-pod/fields/MediaUrlsField', () => ({
  default: ({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) => (
    <div>
      <input aria-label="media-text" value={value} onChange={(e) => onChange(e.target.value)} />
      {error ? <span>{error}</span> : null}
    </div>
  ),
}));

vi.mock('../SettlementPreview', () => ({
  default: ({ podId, venueBillAmount }: { podId: string; venueBillAmount: number }) => (
    <div data-testid="settlement-preview">{`preview:${podId}:${venueBillAmount}`}</div>
  ),
}));

const podNoVenue: HostPodForComplete = { id: 'pod-1', pod_title: 'Beach Bash', venue_id: null };
const podWithVenue: HostPodForComplete = { id: 'pod-2', pod_title: 'Club Night', venue_id: 'venue-9' };

function renderForm(
  pod: HostPodForComplete | null,
  mocks: React.ComponentProps<typeof MockedProvider>['mocks'] = [],
) {
  const onClose = vi.fn();
  const onCompleted = vi.fn();
  const utils = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PodCompleteForm pod={pod} onClose={onClose} onCompleted={onCompleted} />
    </MockedProvider>,
  );
  return { onClose, onCompleted, ...utils };
}

describe('buildPodCompleteSchema', () => {
  it('requires at least one media line', () => {
    const res = buildPodCompleteSchema(false).safeParse({ venue_bill_amount: '', bill_url: '', media_text: '   \n  ' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.map((i) => i.path[0])).toContain('media_text');
    }
  });

  it('passes with a media line and no venue', () => {
    const res = buildPodCompleteSchema(false).safeParse({ venue_bill_amount: '', bill_url: '', media_text: 'http://x.jpg' });
    expect(res.success).toBe(true);
  });

  it('requires bill amount and bill url when a venue is present', () => {
    const res = buildPodCompleteSchema(true).safeParse({ venue_bill_amount: '0', bill_url: '', media_text: 'http://x.jpg' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(['venue_bill_amount', 'bill_url']));
    }
  });

  it('passes with a venue when bill amount and url are provided', () => {
    const res = buildPodCompleteSchema(true).safeParse({ venue_bill_amount: '500', bill_url: 'http://bill.pdf', media_text: 'http://x.jpg' });
    expect(res.success).toBe(true);
  });
});

describe('buildCompleteInput', () => {
  it('maps values, classifying media by extension and dropping an empty bill', () => {
    const values: PodCompleteValues = {
      venue_bill_amount: '',
      bill_url: '   ',
      media_text: 'http://a.jpg\n http://b.mov \n',
    };
    expect(buildCompleteInput(values, 'pod-1')).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 0,
      bill_url: undefined,
      evidence_media: [
        { url: 'http://a.jpg', type: 'IMAGE' },
        { url: 'http://b.mov', type: 'VIDEO' },
      ],
    });
  });

  it('keeps a numeric amount and trimmed bill url', () => {
    const out = buildCompleteInput(
      { venue_bill_amount: '750', bill_url: ' http://bill.pdf ', media_text: 'http://c.webm' },
      'pod-2',
    );
    expect(out.venue_bill_amount).toBe(750);
    expect(out.bill_url).toBe('http://bill.pdf');
    expect(out.evidence_media).toEqual([{ url: 'http://c.webm', type: 'VIDEO' }]);
  });
});

describe('PodCompleteForm', () => {
  it('renders nothing when pod is null (dialog closed)', () => {
    renderForm(null);
    expect(screen.queryByText('Complete pod')).not.toBeInTheDocument();
  });

  it('renders without the venue bill field when the pod has no venue', () => {
    renderForm(podNoVenue);
    expect(screen.getByText('Complete pod')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /venue bill amount/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('media-text')).toBeInTheDocument();
    expect(screen.getByTestId('settlement-preview')).toHaveTextContent('preview:pod-1:0');
  });

  it('renders the venue bill field and updates the preview amount for a venue pod', () => {
    renderForm(podWithVenue);
    const amount = screen.getByRole('spinbutton', { name: /venue bill amount/i });
    expect(amount).toBeInTheDocument();
    fireEvent.change(amount, { target: { value: '1200' } });
    expect(screen.getByTestId('settlement-preview')).toHaveTextContent('preview:pod-2:1200');
  });

  it('shows validation errors when submitting an empty venue pod', async () => {
    renderForm(podWithVenue);
    // Submit the form directly: an external submit button plus an empty required
    // number field would otherwise be blocked by jsdom's HTML5 constraint check.
    fireEvent.submit(document.getElementById('pod-complete-form') as HTMLFormElement);
    expect(await screen.findByText(/enter the venue bill amount/i)).toBeInTheDocument();
    expect(screen.getByText(/upload the venue bill/i)).toBeInTheDocument();
    expect(screen.getByText(/add at least one party photo or video/i)).toBeInTheDocument();
  });

  it('fires onClose when Cancel is clicked', () => {
    const { onClose } = renderForm(podNoVenue);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits the mutation and calls onCompleted on success', async () => {
    const mock = {
      request: {
        query: COMPLETE_POD,
        variables: {
          input: {
            pod_id: 'pod-1',
            venue_bill_amount: 0,
            bill_url: undefined,
            evidence_media: [{ url: 'http://x.jpg', type: 'IMAGE' }],
          },
        },
      },
      result: {
        data: {
          completePodSettlement: {
            settlement: { currency_symbol: '₹', host: { payout_amount: 100 } },
            releases: [{ id: 'r1', kind: 'HOST', status: 'PENDING' }],
          },
        },
      },
    };
    const { onCompleted } = renderForm(podNoVenue, [mock]);
    fireEvent.change(screen.getByLabelText('media-text'), { target: { value: 'http://x.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });

  it('shows an error alert when the mutation fails', async () => {
    const mock = {
      request: {
        query: COMPLETE_POD,
        variables: {
          input: {
            pod_id: 'pod-1',
            venue_bill_amount: 0,
            bill_url: undefined,
            evidence_media: [{ url: 'http://y.jpg', type: 'IMAGE' }],
          },
        },
      },
      error: new Error('Settlement failed'),
    };
    const { onCompleted } = renderForm(podNoVenue, [mock]);
    fireEvent.change(screen.getByLabelText('media-text'), { target: { value: 'http://y.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByText(/settlement failed/i)).toBeInTheDocument();
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
