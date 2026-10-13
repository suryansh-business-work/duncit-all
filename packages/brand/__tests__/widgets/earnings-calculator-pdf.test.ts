import { describe, expect, it } from 'vitest';
import { buildEstimatePdf } from '../../src/widgets/earnings-calculator-pdf';
import type { JsPdfCtor, PdfDoc } from '../../src/widgets/earnings-calculator-pdf-lib';
import type { EarnSnapshot } from '../../src/widgets/earnings-calculator-types';

interface Call {
  method: string;
  args: unknown[];
}

/** A recording stand-in for jsPDF: every drawing call returns the doc itself. */
function makeCtor(): { Ctor: JsPdfCtor; calls: Call[]; ctorArgs: unknown[] } {
  const calls: Call[] = [];
  const ctorArgs: unknown[] = [];
  class FakeDoc {
    constructor(options: unknown) {
      ctorArgs.push(options);
      return new Proxy(this, {
        get(_target, prop: string) {
          if (prop === 'splitTextToSize') {
            return (text: string) => {
              calls.push({ method: prop, args: [text] });
              return text.split('|');
            };
          }
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            return prop === 'save' ? undefined : receiver;
          };
        },
      });
    }
  }
  const receiver = new FakeDoc({}) as unknown as PdfDoc;
  ctorArgs.length = 0;
  calls.length = 0;
  return { Ctor: FakeDoc as unknown as JsPdfCtor, calls, ctorArgs };
}

const snapshot = (over: Partial<EarnSnapshot> = {}): EarnSnapshot => ({
  role: {
    key: 'host',
    label: 'Host',
    name: 'Pod host',
    field: 'host_receives',
    takeHomeLabel: 'You take home',
    rows: ['gross', 'gst'],
    dutiesTitle: 'What you do',
    duties: ['Show up', 'Greet guests'],
  },
  fields: [
    { name: 'ticket', label: 'Ticket price', prefix: '₹' },
    { name: 'spots', label: 'Spots' },
    { name: 'pods', label: 'Pods', roles: ['club_admin'] },
  ],
  rowLabels: { gross: 'Ticket revenue', gst: 'GST' },
  copy: {
    note: '',
    shortfallNote: '',
    noShareNote: '',
    loadError: '',
    disclaimer: 'Estimates only',
    pdf: {
      title: 'Earnings estimate',
      inputsTitle: 'Inputs',
      breakdownTitle: 'Breakdown',
      footer: 'Printed on',
      preparing: '',
      error: '',
      fileName: 'estimate.pdf',
    },
  },
  takeHome: '₹1,234.00',
  sliderValue: (name) => ({ ticket: 1500, spots: 10, pods: 4 })[name] ?? 0,
  rowText: (key) => (key === 'gross' ? '₹15,000.00' : '− ₹2,700.00'),
  ...over,
});

const texts = (calls: Call[]) => calls.filter((c) => c.method === 'text').map((c) => c.args[0]);

describe('buildEstimatePdf', () => {
  it('creates an A4 mm document titled after the role', () => {
    const { Ctor, calls, ctorArgs } = makeCtor();
    buildEstimatePdf(Ctor, null, snapshot());
    expect(ctorArgs[0]).toEqual({ unit: 'mm', format: 'a4' });
    const props = calls.find((c) => c.method === 'setProperties');
    expect(props?.args[0]).toEqual({ title: 'Earnings estimate: Pod host', author: 'Duncit' });
  });

  it('draws the wordmark when there is no logo, and the logo image when there is', () => {
    const noLogo = makeCtor();
    buildEstimatePdf(noLogo.Ctor, null, snapshot());
    expect(texts(noLogo.calls)).toContain('duncit');
    expect(noLogo.calls.some((c) => c.method === 'addImage')).toBe(false);

    const withLogo = makeCtor();
    buildEstimatePdf(withLogo.Ctor, { dataUrl: 'data:image/png;base64,AA', w: 200, h: 50, format: 'PNG' }, snapshot());
    const image = withLogo.calls.find((c) => c.method === 'addImage');
    expect(image?.args).toEqual(['data:image/png;base64,AA', 'PNG', 16, 16, 56, 14]);
    expect(texts(withLogo.calls)).not.toContain('duncit');
  });

  it('lists only the inputs this role uses, with prefixes and grouping', () => {
    const { Ctor, calls } = makeCtor();
    buildEstimatePdf(Ctor, null, snapshot());
    const all = texts(calls);
    expect(all).toContain('Ticket price');
    expect(all).toContain('Rs. 1,500');
    expect(all).toContain('10');
    expect(all).not.toContain('Pods');
  });

  it('shows role-specific inputs for the role they belong to', () => {
    const { Ctor, calls } = makeCtor();
    const snap = snapshot();
    buildEstimatePdf(Ctor, null, { ...snap, role: { ...snap.role, key: 'club_admin' } });
    expect(texts(calls)).toContain('Pods');
  });

  it('writes the breakdown rows, take-home, duties and the dated footer, sanitised', () => {
    const { Ctor, calls } = makeCtor();
    buildEstimatePdf(Ctor, null, snapshot());
    const all = texts(calls);
    expect(all).toContain('Ticket revenue');
    expect(all).toContain('Rs. 15,000.00');
    expect(all).toContain('- Rs. 2,700.00');
    expect(all).toContain('Rs. 1,234.00');
    expect(all).toContain('You take home');
    expect(all).toContain('Earnings estimate');
    expect(all).toContain('INPUTS');
    expect(all).toContain('BREAKDOWN');
    expect(all).toContainEqual(['Show up']);
    expect(all.some((t) => typeof t === 'string' && t.startsWith('Printed on '))).toBe(true);
  });

  it('draws one bullet per duty and wraps long duties', () => {
    const { Ctor, calls } = makeCtor();
    const snap = snapshot();
    buildEstimatePdf(Ctor, null, {
      ...snap,
      role: { ...snap.role, duties: ['one|two|three'] },
    });
    expect(calls.filter((c) => c.method === 'circle')).toHaveLength(1);
    expect(texts(calls)).toContainEqual(['one', 'two', 'three']);
  });

  it('adds a page when the content runs off the sheet and keeps drawing', () => {
    const { Ctor, calls } = makeCtor();
    const snap = snapshot();
    const duties = Array.from({ length: 60 }, (_, i) => `Duty ${i}`);
    buildEstimatePdf(Ctor, null, { ...snap, role: { ...snap.role, duties } });
    expect(calls.filter((c) => c.method === 'addPage').length).toBeGreaterThan(0);
    expect(texts(calls)).toContainEqual(['Duty 59']);
  });

  it('does not add a page for a short estimate', () => {
    const { Ctor, calls } = makeCtor();
    buildEstimatePdf(Ctor, null, snapshot());
    expect(calls.some((c) => c.method === 'addPage')).toBe(false);
  });

  it('returns the document so the caller can save it', () => {
    const { Ctor } = makeCtor();
    const doc = buildEstimatePdf(Ctor, null, snapshot());
    expect(typeof doc.save).toBe('function');
  });
});
