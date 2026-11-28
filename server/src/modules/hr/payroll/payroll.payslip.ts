/**
 * Payslips: a released payroll line, as the employee reads it and as a PDF.
 * The Employee console reaches only the caller's own published lines; HR can
 * print any line, including a draft to check it before approval.
 */
import { Types } from 'mongoose';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { PDF_PALETTE, drawPdfFooters, pdfCurrencyNote, pdfSafeText, renderPdf } from '@services/pdf/document';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { dayLabel } from '@modules/hr/leave/leave.notify';
import { HrPayrollLineModel, HrPayrollRunModel, type IPayrollLine, type IPayrollRun } from './payroll.model';
import { payslipStatusOf, toLine } from './payroll.mapper';
import { monthLabel } from './payroll.notify';

const MAX_PAYSLIPS = 36;

async function runsFor(lines: readonly Pick<IPayrollLine, 'run_id'>[]) {
  const runs = await HrPayrollRunModel.find({ _id: { $in: lines.map((l) => l.run_id) } }).select('pay_on status').lean<IPayrollRun[]>();
  return new Map(runs.map((run) => [String(run._id), run]));
}

function toPayslip(line: IPayrollLine, run: Pick<IPayrollRun, 'pay_on'> | undefined) {
  return {
    ...toLine(line),
    status: payslipStatusOf(line, run?.pay_on ?? null),
    pay_on: run?.pay_on ?? null,
    paid_at: line.payout?.status === 'PAID' ? (line.payout.completed_at?.toISOString?.() ?? null) : null,
    reference: line.payout?.status === 'PAID' ? line.payout.utr || null : null,
  };
}

async function ownLine(userId: string, id: string): Promise<IPayrollLine> {
  const line = await HrPayrollLineModel.findOne({ _id: objectId(id, 'payslip'), user_id: new Types.ObjectId(userId), published: true }).lean<IPayrollLine>();
  return line ?? fail('NOT_FOUND', 'Payslip not found');
}

export const payslipService = {
  async mine(userId: string) {
    const lines = await HrPayrollLineModel.find({ user_id: new Types.ObjectId(userId), published: true })
      .sort({ month: -1 })
      .limit(MAX_PAYSLIPS)
      .lean<IPayrollLine[]>();
    const runs = await runsFor(lines);
    return lines.map((line) => toPayslip(line, runs.get(String(line.run_id))));
  },

  async one(userId: string, id: string) {
    const line = await ownLine(userId, id);
    const runs = await runsFor([line]);
    return toPayslip(line, runs.get(String(line.run_id)));
  },

  async myPdf(userId: string, id: string): Promise<string> {
    const line = await ownLine(userId, id);
    return (await payslipPdf(line)).toString('base64');
  },

  async hrPdf(lineId: string): Promise<string> {
    const line = await HrPayrollLineModel.findById(objectId(lineId, 'payroll line')).lean<IPayrollLine>();
    if (!line) return fail('NOT_FOUND', 'Payroll line not found');
    return (await payslipPdf(line)).toString('base64');
  },
};

// --- PDF ---------------------------------------------------------------------

const SIDE = 40;
const { accent, ink, muted, line: rule, stripe, paper } = PDF_PALETTE;

const figure = (paise: number, currency: string) =>
  `${currency} ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Row {
  label: string;
  value: string;
}

function drawTable(doc: PDFKit.PDFDocument, title: string, rows: Row[], x: number, y: number, width: number): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(title, x, y, { width });
  let cursor = y + 18;
  rows.forEach((row, index) => {
    const height = Math.max(16, doc.font('Helvetica').fontSize(9).heightOfString(row.label, { width: width - 110 }) + 6);
    if (index % 2 === 0) doc.rect(x, cursor - 3, width, height).fill(stripe);
    doc.fillColor(ink).font('Helvetica').fontSize(9).text(pdfSafeText(row.label), x + 6, cursor, { width: width - 116 });
    doc.text(row.value, x + width - 106, cursor, { width: 100, align: 'right' });
    cursor += height;
  });
  return cursor;
}

function detailPairs(doc: PDFKit.PDFDocument, pairs: [string, string][], x: number, y: number, width: number): number {
  let cursor = y;
  for (const [label, value] of pairs) {
    doc.font('Helvetica').fontSize(8).fillColor(muted).text(label, x, cursor, { width });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(pdfSafeText(value || '-'), x, cursor + 10, { width });
    cursor += 28;
  }
  return cursor;
}

export async function payslipPdf(line: IPayrollLine): Promise<Buffer> {
  const [settings, runs] = await Promise.all([getFinanceSettings(), runsFor([line])]);
  const run = runs.get(String(line.run_id));
  const c = line.currency;
  const earnings: Row[] = [
    ...line.earnings.map((e) => ({ label: e.label, value: figure(e.amount_paise, c) })),
    ...line.variable.map((v) => ({ label: `${v.label} (${monthLabel(v.target_month)}, ${v.completion_percent}%)`, value: figure(v.amount_paise, c) })),
    ...line.adjustments.filter((a) => a.type === 'EARNING').map((a) => ({ label: a.label, value: figure(a.amount_paise, c) })),
  ];
  const deductions: Row[] = [
    ...line.deductions.map((d) => ({ label: d.label, value: figure(d.amount_paise, c) })),
    ...line.adjustments.filter((a) => a.type === 'DEDUCTION').map((a) => ({ label: a.label, value: figure(a.amount_paise, c) })),
  ];
  return renderPdf(
    (doc) => {
      const right = doc.page.width - SIDE;
      const width = right - SIDE;
      doc.rect(0, 0, doc.page.width, 70).fill(accent);
      doc.fillColor(paper).font('Helvetica-Bold').fontSize(18).text(pdfSafeText(settings.business_name || 'Payslip'), SIDE, 22, { width: width / 2 });
      doc.font('Helvetica').fontSize(11).text(`Payslip for ${monthLabel(line.month)}`, SIDE + width / 2, 28, { width: width / 2, align: 'right' });

      const half = (width - 20) / 2;
      const leftEnd = detailPairs(doc, [
        ['Employee', `${line.employee.name} (${line.employee.code})`],
        ['Job title', line.employee.job_title],
        ['Department', line.employee.department ?? ''],
        ['Date of joining', dayLabel(line.employee.date_of_joining)],
      ], SIDE, 90, half);
      const status = payslipStatusOf(line, run?.pay_on ?? null);
      const rightEnd = detailPairs(doc, [
        ['Days paid', `${line.payable_days} of ${line.days_in_month}${line.lop_days ? ` (${line.lop_days} unpaid)` : ''}`],
        ['Bank account', line.bank ? `ending ${line.bank.account_last4} (${line.bank.ifsc})` : ''],
        ['Pay date', run?.pay_on ? dayLabel(run.pay_on) : ''],
        ['Payment', status === 'PAID' && line.payout?.utr ? `Paid, reference ${line.payout.utr}` : status.replace('_', ' ').toLowerCase()],
      ], SIDE + half + 20, 90, half);

      const top = Math.max(leftEnd, rightEnd) + 10;
      const earnEnd = drawTable(doc, 'Earnings', earnings, SIDE, top, half);
      const dedEnd = drawTable(doc, 'Deductions', deductions, SIDE + half + 20, top, half);
      let y = Math.max(earnEnd, dedEnd) + 14;
      doc.moveTo(SIDE, y).lineTo(right, y).strokeColor(rule).stroke();
      y += 10;
      for (const [label, value, bold] of [
        ['Gross earnings', figure(line.gross_paise, c), false],
        ['Total deductions', figure(line.deductions_paise, c), false],
        ['Net pay', figure(line.net_paise, c), true],
      ] as const) {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 13 : 10).fillColor(ink).text(label, SIDE, y, { width: width - 160 });
        doc.text(value, right - 160, y, { width: 160, align: 'right' });
        y += bold ? 22 : 16;
      }
      if (line.employer.length > 0) {
        y += 8;
        doc.font('Helvetica').fontSize(8).fillColor(muted).text(
          `Paid by the employer on top of your salary: ${line.employer.map((e) => `${e.label} ${figure(e.amount_paise, c)}`).join(', ')}.`,
          SIDE,
          y,
          { width }
        );
      }
      const note = [pdfCurrencyNote(c), 'This payslip is generated by the system and needs no signature.'].filter(Boolean).join(' ');
      const support = [settings.invoice_support_email, settings.invoice_support_phone].filter(Boolean).join('  ·  ');
      drawPdfFooters(doc, { left: SIDE, right, zone: 44, note, support });
    },
    { bufferPages: true, info: { Title: `Payslip ${line.month} ${line.employee.code}` } }
  );
}
