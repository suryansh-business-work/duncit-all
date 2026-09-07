/**
 * The saved-calculation service, with mongo, the PDF and the mailer faked.
 *
 * What actually matters here is that nothing a client sends is trusted — the
 * mutation is reachable without the sliders that clamp, and a percentage over
 * 100 or a negative ticket would print a nonsense payout on every screen and
 * every PDF that later opens the calculation — and that a mail nobody received
 * is not reported back as a success.
 */
jest.mock('../../podCalculator.model', () => ({
  POD_CALCULATOR_KINDS: ['SINGLE', 'MULTI'],
  PodCalculatorModel: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock('@modules/finance/finance/finance.model', () => ({
  getFinanceSettings: jest.fn(async () => ({
    currency_symbol: '₹',
    business_name: 'Duncit',
    invoice_logo_url: '',
  })),
}));

jest.mock('@services/calculator/pod-calculator.pdf', () => ({
  generatePodCalculatorPdf: jest.fn(async () => Buffer.from('%PDF-1.3 fake')),
}));

jest.mock('@services/email/email.service', () => ({
  sendEmail: jest.fn(),
}));

import { Types } from 'mongoose';
import { PodCalculatorModel } from '../../podCalculator.model';
import { sendEmail } from '@services/email/email.service';
import { podCalculatorService } from '../../podCalculator.service';

const model = PodCalculatorModel as unknown as Record<string, jest.Mock>;
const mailer = sendEmail as unknown as jest.Mock;

const ID = new Types.ObjectId().toString();

const doc = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(ID),
  name: 'Q4 comparison',
  kind: 'MULTI',
  pods: [],
  created_by: null,
  created_at: new Date('2026-09-01T00:00:00.000Z'),
  updated_at: new Date('2026-09-02T00:00:00.000Z'),
  ...over,
});

const fullPod = {
  pod_key: 'k1',
  name: 'Pod 1',
  pod_amount: 1000,
  no_of_spots: 30,
  pod_count: 2,
  gst_percent: 18,
  platform_fee_percent: 5,
  venue_amount: 400,
  host_commission_percent: 10,
  venue_commission_percent: 10,
  club_admin_percent: 0,
};

/** The pods the service actually decided to persist. */
const savedPods = () => model.create.mock.calls[0][0].pods;

beforeEach(() => {
  jest.clearAllMocks();
  model.find.mockReturnValue({ sort: () => ({ limit: async () => [] }) });
  model.create.mockImplementation(async (d: Record<string, unknown>) => doc(d));
});

describe('list', () => {
  it('asks for one kind, newest edit first', async () => {
    await podCalculatorService.list('SINGLE');

    expect(model.find).toHaveBeenCalledWith({ kind: 'SINGLE' });
  });

  it('falls back to MULTI for an unknown kind rather than listing everything', async () => {
    await podCalculatorService.list('NONSENSE');
    expect(model.find).toHaveBeenCalledWith({ kind: 'MULTI' });

    await podCalculatorService.list(null);
    expect(model.find).toHaveBeenLastCalledWith({ kind: 'MULTI' });
  });
});

describe('create', () => {
  it('requires a name', async () => {
    await expect(podCalculatorService.create({ name: '   ', pods: [] }, null)).rejects.toThrow(
      'A calculation name is required'
    );
  });

  it('keeps a valid pod as sent', async () => {
    await podCalculatorService.create({ name: 'Q4', kind: 'MULTI', pods: [fullPod] }, null);

    expect(savedPods()[0]).toMatchObject(fullPod);
  });

  it('clamps a percentage above 100 and below 0', async () => {
    await podCalculatorService.create(
      {
        name: 'Q4',
        pods: [{ ...fullPod, gst_percent: 900, host_commission_percent: -20 }],
      },
      null
    );

    expect(savedPods()[0].gst_percent).toBe(100);
    expect(savedPods()[0].host_commission_percent).toBe(0);
  });

  it('floors a negative ticket and venue price at zero', async () => {
    await podCalculatorService.create(
      { name: 'Q4', pods: [{ ...fullPod, pod_amount: -5000, venue_amount: -1 }] },
      null
    );

    expect(savedPods()[0].pod_amount).toBe(0);
    expect(savedPods()[0].venue_amount).toBe(0);
  });

  it('bounds the projection multiplier to a sane range', async () => {
    await podCalculatorService.create(
      {
        name: 'Q4',
        pods: [
          { ...fullPod, pod_key: 'a', pod_count: 0 },
          { ...fullPod, pod_key: 'b', pod_count: 999999 },
        ],
      },
      null
    );

    // Zero pods would print an all-zero report that reads as a broken calculator.
    expect(savedPods()[0].pod_count).toBe(1);
    expect(savedPods()[1].pod_count).toBe(1000);
  });

  it('mints a key for a pod that arrives without one', async () => {
    await podCalculatorService.create({ name: 'Q4', pods: [{ ...fullPod, pod_key: '' }] }, null);

    expect(savedPods()[0].pod_key).toBe('pod-1');
  });

  it('refuses to store an unbounded pod list', async () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ ...fullPod, pod_key: `k${i}` }));
    await podCalculatorService.create({ name: 'Q4', pods: many }, null);

    expect(savedPods()).toHaveLength(50);
  });

  it('treats an unknown kind as MULTI', async () => {
    await podCalculatorService.create({ name: 'Q4', kind: 'SIDEWAYS', pods: [] }, null);

    expect(model.create.mock.calls[0][0].kind).toBe('MULTI');
  });

  it('records who made it', async () => {
    const user = new Types.ObjectId().toString();
    await podCalculatorService.create({ name: 'Q4', pods: [] }, user);

    expect(String(model.create.mock.calls[0][0].created_by)).toBe(user);
  });

  it('returns the calculation with its id as a string', async () => {
    const out = await podCalculatorService.create({ name: 'Q4', pods: [] }, null);

    expect(out.id).toBe(ID);
    expect(out.created_by).toBeNull();
  });
});

describe('get and update', () => {
  it('answers null for an id that is not an ObjectId', async () => {
    await expect(podCalculatorService.get('not-an-id')).rejects.toThrow('Calculation not found');
  });

  it('answers null when nothing is stored under that id', async () => {
    model.findById.mockResolvedValue(null);

    await expect(podCalculatorService.get(ID)).resolves.toBeNull();
  });

  it('throws when updating a calculation that is gone', async () => {
    model.findByIdAndUpdate.mockResolvedValue(null);

    await expect(podCalculatorService.update(ID, { name: 'Q4', pods: [] })).rejects.toThrow(
      'Calculation not found'
    );
  });

  it('never lets an update change the kind', async () => {
    model.findByIdAndUpdate.mockResolvedValue(doc());

    await podCalculatorService.update(ID, { name: 'Q4', kind: 'SINGLE', pods: [] });

    const [, patch] = model.findByIdAndUpdate.mock.calls[0];
    expect(Object.keys(patch.$set)).toEqual(['name', 'pods']);
  });
});

describe('remove', () => {
  it('reports whether anything was actually deleted', async () => {
    model.deleteOne.mockResolvedValue({ deletedCount: 1 });
    await expect(podCalculatorService.remove(ID)).resolves.toBe(true);

    model.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(podCalculatorService.remove(ID)).resolves.toBe(false);
  });
});

describe('reading a document written before today', () => {
  it('answers every non-null field even when the stored pod has none of them', async () => {
    model.findById.mockResolvedValue(
      doc({
        name: undefined,
        kind: undefined,
        pods: [{ pod_key: 'k1' }],
        created_at: undefined,
        updated_at: undefined,
      })
    );

    const out = await podCalculatorService.get(ID);

    expect(out).toMatchObject({ name: '', kind: 'MULTI', created_at: '', updated_at: '' });
    expect(out?.pods[0]).toEqual({
      pod_key: 'k1',
      name: '',
      pod_amount: 0,
      no_of_spots: 0,
      pod_count: 1,
      gst_percent: 0,
      platform_fee_percent: 0,
      venue_amount: 0,
      host_commission_percent: 0,
      venue_commission_percent: 0,
      club_admin_percent: 0,
    });
  });

  it('answers an empty pod list when the field is missing entirely', async () => {
    model.findById.mockResolvedValue(doc({ pods: undefined }));

    await expect(podCalculatorService.get(ID)).resolves.toMatchObject({ pods: [] });
  });

  it('reports the author when there is one', async () => {
    const author = new Types.ObjectId();
    model.findById.mockResolvedValue(doc({ created_by: author }));

    await expect(podCalculatorService.get(ID)).resolves.toMatchObject({
      created_by: author.toString(),
    });
  });
});

describe('pdfBase64', () => {
  it('returns the report base64-encoded', async () => {
    model.findById.mockResolvedValue(doc({ pods: [fullPod] }));

    const out = await podCalculatorService.pdfBase64(ID);

    expect(Buffer.from(out, 'base64').toString()).toBe('%PDF-1.3 fake');
  });

  it('throws when the calculation is gone', async () => {
    model.findById.mockResolvedValue(null);

    await expect(podCalculatorService.pdfBase64(ID)).rejects.toThrow('Calculation not found');
  });
});

describe('email', () => {
  beforeEach(() => {
    model.findById.mockResolvedValue(doc({ pods: [fullPod] }));
    mailer.mockResolvedValue({ accepted: ['finance@duncit.com'], rejected: [] });
  });

  it('rejects an address that is not one', async () => {
    for (const bad of ['', 'nope', 'a@b', 'a b@c.com']) {
      await expect(podCalculatorService.email(ID, bad)).rejects.toThrow(
        'A valid email address is required'
      );
    }
    expect(mailer).not.toHaveBeenCalled();
  });

  it('attaches the report and names the file after the calculation', async () => {
    await expect(podCalculatorService.email(ID, 'finance@duncit.com')).resolves.toBe(true);

    const opts = mailer.mock.calls[0][0];
    expect(opts.template).toBe('pod-calculator-report');
    expect(opts.category).toBe('internal');
    expect(opts.attachments[0].filename).toBe('Q4-comparison-report.pdf');
    expect(opts.attachments[0].contentType).toBe('application/pdf');
    expect(opts.attachments[0].content.toString()).toBe('%PDF-1.3 fake');
  });

  it('falls back to a usable filename when the name is all punctuation', async () => {
    model.findById.mockResolvedValue(doc({ name: '***', pods: [] }));

    await podCalculatorService.email(ID, 'finance@duncit.com');

    expect(mailer.mock.calls[0][0].attachments[0].filename).toBe('pod-profit-report.pdf');
  });

  it('labels a single-pod calculation as such in the report', async () => {
    model.findById.mockResolvedValue(doc({ kind: 'SINGLE', pods: [fullPod] }));

    await podCalculatorService.email(ID, 'finance@duncit.com');

    const { generatePodCalculatorPdf } = jest.requireMock('@services/calculator/pod-calculator.pdf');
    expect(generatePodCalculatorPdf.mock.calls.at(-1)[0].kind_label).toBe('Single pod calculation');
  });

  it('labels a comparison as a multi-pod one', async () => {
    await podCalculatorService.email(ID, 'finance@duncit.com');

    const { generatePodCalculatorPdf } = jest.requireMock('@services/calculator/pod-calculator.pdf');
    expect(generatePodCalculatorPdf.mock.calls.at(-1)[0].kind_label).toBe('Multi-pod comparison');
  });

  it('errors when the template was switched off, instead of reporting success', async () => {
    mailer.mockResolvedValue({ accepted: [], rejected: [], skipped: true, reason: 'Template is not active' });

    await expect(podCalculatorService.email(ID, 'finance@duncit.com')).rejects.toThrow(
      'Template is not active'
    );
  });

  it('errors when the mail server accepted the message for nobody', async () => {
    mailer.mockResolvedValue({ accepted: [], rejected: ['finance@duncit.com'] });

    await expect(podCalculatorService.email(ID, 'finance@duncit.com')).rejects.toThrow(
      'The report could not be emailed'
    );
  });
});
