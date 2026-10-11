import { fromZonedTime } from 'date-fns-tz';
import { PDF_PALETTE, loadPdfImage, pdfCurrency, renderPdf } from '@services/pdf/document';
import { appDate, appDateTime, appFormat, appTime } from '@utils/app-time';
import type { WalletStatement, WalletStatementRow } from './walletStatement.service';

/**
 * The wallet account statement as a PDF, in the house style of the invoice
 * (brand band, business block, soft account card, accent table header, right-
 * aligned totals) and laid out the way a bank statement reads: opening balance,
 * one dated row per ledger entry with its running balance, closing balance.
 *
 * Nothing about the business is written here. The name, address, GSTIN, logo
 * and support contacts are the ones Finance > Invoice Management holds, passed
 * in by the caller — the same source the invoice prints from.
 *
 * Pages are buffered so the footer can say "Page x of y", and the table header
 * is redrawn at the top of every page a long statement runs onto.
 */
export interface StatementBranding {
  business_name: string;
  business_address: string;
  business_gstin: string;
  support_email: string;
  support_phone: string;
  logo_url: string;
}

const SIDE = 40;
const BAND = 96;
const FOOTER_ZONE = 56;
const HEADER_ROW = 24;
const CELL_PAD = 6;
const { accent, accentSoft, ink, muted, line, paper } = PDF_PALETTE;

interface Column {
  x: number;
  width: number;
}

interface Columns {
  date: Column;
  details: Column;
  debit: Column;
  credit: Column;
  /** Absent when the ledger did not reconcile — no balance is printed at all. */
  balance: Column | null;
}

/** Column boxes across the printable width; the details column takes what the balance gives up. */
function columnsFor(left: number, right: number, withBalance: boolean): Columns {
  const dateWidth = 84;
  const amountWidth = 64;
  const balanceWidth = withBalance ? 74 : 0;
  const detailsX = left + CELL_PAD + dateWidth + CELL_PAD;
  const balanceX = right - CELL_PAD - balanceWidth;
  const creditX = (withBalance ? balanceX - CELL_PAD : right - CELL_PAD) - amountWidth;
  const debitX = creditX - CELL_PAD - amountWidth;
  return {
    date: { x: left + CELL_PAD, width: dateWidth },
    details: { x: detailsX, width: debitX - CELL_PAD - detailsX },
    debit: { x: debitX, width: amountWidth },
    credit: { x: creditX, width: amountWidth },
    balance: withBalance ? { x: balanceX, width: balanceWidth } : null,
  };
}

const amount = (value: number) => value.toFixed(2);
/** A debit or credit cell: blank rather than 0.00 on the side the row did not move. */
const movement = (value: number) => (value > 0 ? amount(value) : '');

/** A period day ('yyyy-MM-dd') in the admin's date pattern, read in the statement's own zone. */
const dayLabel = (day: string, zone: string) => appDate(fromZonedTime(`${day}T00:00:00`, zone));

interface Page {
  doc: PDFKit.PDFDocument;
  left: number;
  right: number;
  bottom: number;
  columns: Columns;
  currency: string;
}

function drawBrandBand(page: Page, branding: StatementBranding, logo: Buffer | null): void {
  const { doc, left, right } = page;
  doc.rect(0, 0, doc.page.width, BAND).fill(accent);
  let drewLogo = false;
  if (logo) {
    try {
      doc.image(logo, left, 26, { fit: [150, 44], valign: 'center' });
      drewLogo = true;
    } catch {
      // A logo pdfkit cannot decode falls back to the business name below.
      drewLogo = false;
    }
  }
  if (!drewLogo) {
    doc.fillColor(paper).fontSize(22).font('Helvetica-Bold').text(branding.business_name, left, 34, { lineBreak: false });
  }
  doc
    .fillColor(paper)
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('ACCOUNT STATEMENT', left, 38, { width: right - left, align: 'right', lineBreak: false });
}

/** Business block on the left, statement facts on the right. Returns the y below both. */
function drawMeta(page: Page, s: WalletStatement, branding: StatementBranding): number {
  const { doc, left, right } = page;
  const top = BAND + 20;
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(branding.business_name, left, top, { width: 250 });
  doc.fillColor(muted).fontSize(9).font('Helvetica');
  if (branding.business_address) doc.text(branding.business_address, left, doc.y + 2, { width: 250 });
  if (branding.business_gstin) doc.text(`GSTIN: ${branding.business_gstin}`, left, doc.y + 2, { width: 250 });
  const leftBottom = doc.y;

  const metaX = left + 270;
  const metaWidth = right - metaX;
  const period = `${dayLabel(s.period_from, s.time_zone)} to ${dayLabel(s.period_to, s.time_zone)}`;
  doc.fillColor(muted).fontSize(9).font('Helvetica').text('Statement period', metaX, top, { width: metaWidth, align: 'right' });
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(period, metaX, doc.y, { width: metaWidth, align: 'right' });
  doc
    .fillColor(muted)
    .fontSize(9)
    .font('Helvetica')
    .text(`Generated: ${appDateTime(s.generated_at)}`, metaX, doc.y + 4, { width: metaWidth, align: 'right' })
    .text(`Time zone: ${s.time_zone} (UTC${appFormat(s.generated_at, 'xxx')})`, metaX, doc.y + 2, {
      width: metaWidth,
      align: 'right',
    })
    .text(`Currency: ${page.currency}`, metaX, doc.y + 2, { width: metaWidth, align: 'right' });
  return Math.max(leftBottom, doc.y);
}

/** The account holder card, with the opening and closing balance when they reconcile. */
function drawAccountCard(page: Page, s: WalletStatement, y: number): number {
  const { doc, left, right } = page;
  const height = 62;
  doc.roundedRect(left, y, right - left, height, 10).fill(accentSoft);
  doc.fillColor(accent).fontSize(8.5).font('Helvetica-Bold').text('ACCOUNT HOLDER', left + 14, y + 12);
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(s.account_name, left + 14, y + 24, { width: 250, lineBreak: false });
  doc.fillColor(muted).fontSize(9).font('Helvetica').text(s.account_email, left + 14, y + 40, { width: 250, lineBreak: false });
  if (s.opening_balance !== null && s.closing_balance !== null) {
    const boxX = left + 280;
    const boxWidth = right - 14 - boxX;
    doc.fillColor(muted).fontSize(9).font('Helvetica').text('Opening balance', boxX, y + 14, { width: boxWidth - 90, align: 'right' });
    doc.fillColor(ink).font('Helvetica-Bold').text(amount(s.opening_balance), boxX, y + 14, { width: boxWidth, align: 'right' });
    doc.fillColor(muted).font('Helvetica').text('Closing balance', boxX, y + 34, { width: boxWidth - 90, align: 'right' });
    doc.fillColor(accent).fontSize(11).font('Helvetica-Bold').text(amount(s.closing_balance), boxX, y + 33, { width: boxWidth, align: 'right' });
  }
  return y + height;
}

function drawTableHeader(page: Page, y: number): number {
  const { doc, left, right, columns } = page;
  doc.rect(left, y, right - left, HEADER_ROW).fill(accent);
  doc.fillColor(paper).fontSize(8.5).font('Helvetica-Bold');
  const textY = y + 8;
  doc.text('DATE', columns.date.x, textY, { width: columns.date.width, lineBreak: false });
  doc.text('DETAILS', columns.details.x, textY, { width: columns.details.width, lineBreak: false });
  doc.text('DEBIT', columns.debit.x, textY, { width: columns.debit.width, align: 'right', lineBreak: false });
  doc.text('CREDIT', columns.credit.x, textY, { width: columns.credit.width, align: 'right', lineBreak: false });
  if (columns.balance) {
    doc.text('BALANCE', columns.balance.x, textY, { width: columns.balance.width, align: 'right', lineBreak: false });
  }
  return y + HEADER_ROW + 6;
}

/** A new page for the table to run onto: a one-line reminder of whose statement it is, then the header again. */
function continueOnNewPage(page: Page, s: WalletStatement): number {
  const { doc, left, right } = page;
  doc.addPage();
  const label = `Account statement - ${s.account_name} - ${s.period_from} to ${s.period_to} (continued)`;
  doc.fillColor(muted).fontSize(8.5).font('Helvetica').text(label, left, 32, { width: right - left, lineBreak: false });
  return drawTableHeader(page, 50);
}

const subLine = (row: WalletStatementRow) => `Ref: ${row.reference}  ·  ${row.status}`;

function rowHeight(page: Page, row: WalletStatementRow): number {
  const { doc, columns } = page;
  doc.fontSize(8.5).font('Helvetica');
  const description = doc.heightOfString(row.description, { width: columns.details.width });
  doc.fontSize(7.5);
  const sub = doc.heightOfString(subLine(row), { width: columns.details.width });
  return Math.max(description + 2 + sub, 22) + 8;
}

function drawRow(page: Page, row: WalletStatementRow, y: number, height: number): void {
  const { doc, left, right, columns } = page;
  doc.fillColor(ink).fontSize(8.5).font('Helvetica');
  doc.text(appDate(row.occurred_at), columns.date.x, y, { width: columns.date.width, lineBreak: false });
  doc.text(row.description, columns.details.x, y, { width: columns.details.width });
  const afterDescription = doc.y;
  doc.text(movement(row.debit), columns.debit.x, y, { width: columns.debit.width, align: 'right', lineBreak: false });
  doc.text(movement(row.credit), columns.credit.x, y, { width: columns.credit.width, align: 'right', lineBreak: false });
  if (columns.balance && row.balance !== null) {
    doc
      .font('Helvetica-Bold')
      .text(amount(row.balance), columns.balance.x, y, { width: columns.balance.width, align: 'right', lineBreak: false });
  }
  doc.fillColor(muted).fontSize(7.5).font('Helvetica');
  doc.text(appTime(row.occurred_at), columns.date.x, y + 11, { width: columns.date.width, lineBreak: false });
  doc.text(subLine(row), columns.details.x, afterDescription + 2, { width: columns.details.width });
  doc
    .moveTo(left, y + height - 4)
    .lineTo(right, y + height - 4)
    .strokeColor(line)
    .stroke();
}

function drawRows(page: Page, s: WalletStatement, startY: number): number {
  const { doc, left, right } = page;
  let y = startY;
  if (s.rows.length === 0) {
    doc
      .fillColor(muted)
      .fontSize(10)
      .font('Helvetica')
      .text('No transactions in this period.', left, y + 6, { width: right - left, align: 'center' });
    return y + 34;
  }
  for (const row of s.rows) {
    const height = rowHeight(page, row);
    if (y + height > page.bottom) y = continueOnNewPage(page, s);
    drawRow(page, row, y, height);
    y += height;
  }
  return y;
}

function summaryLines(s: WalletStatement): { label: string; value: string; strong?: boolean }[] {
  const t = s.totals;
  const lines: { label: string; value: string; strong?: boolean }[] = [];
  if (s.opening_balance !== null) lines.push({ label: 'Opening balance', value: amount(s.opening_balance) });
  lines.push(
    { label: `Total credits (${t.transaction_count} transactions in all)`, value: amount(t.total_credits) },
    { label: 'Total debits', value: amount(t.total_debits) }
  );
  if (s.closing_balance !== null) lines.push({ label: 'Closing balance', value: amount(s.closing_balance), strong: true });
  lines.push(
    { label: 'Earnings credited', value: amount(t.earnings_credited) },
    { label: 'Withdrawals requested', value: amount(t.withdrawals_requested) },
    { label: 'Withdrawals paid', value: amount(t.withdrawals_paid) },
    { label: 'Withdrawals pending', value: amount(t.withdrawals_pending) },
    { label: 'Withdrawals rejected', value: amount(t.withdrawals_rejected) },
    { label: 'Rejected withdrawals returned', value: amount(t.reversals_credited) }
  );
  return lines;
}

/** The totals block, kept whole: it moves to a fresh page rather than splitting across two. */
function drawSummary(page: Page, s: WalletStatement, startY: number): void {
  const { doc, left, right } = page;
  const lines = summaryLines(s);
  const needed = lines.length * 17 + 60;
  let y = startY + 10;
  if (y + needed > page.bottom) {
    doc.addPage();
    y = 40;
  }
  doc.fillColor(ink).fontSize(10).font('Helvetica-Bold').text('Summary for the period', left, y);
  y += 20;
  const valueX = right - 110;
  for (const item of lines) {
    doc
      .font(item.strong ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(item.strong ? 11 : 9.5)
      .fillColor(item.strong ? ink : muted)
      .text(item.label, left, y, { width: valueX - left - 8, align: 'right', lineBreak: false })
      .fillColor(item.strong ? accent : ink)
      .text(item.value, valueX, y, { width: right - valueX, align: 'right', lineBreak: false });
    y += item.strong ? 20 : 17;
  }
  if (!s.balances_reconciled) {
    doc
      .fillColor(muted)
      .fontSize(8.5)
      .font('Helvetica')
      .text(
        'Opening, running and closing balances are not shown: the wallet ledger could not be reconciled for this period. Every amount above is exactly as recorded. Please contact support.',
        left,
        y + 8,
        { width: right - left }
      );
  }
}

/** Written last, once every page exists, so each one can state the total. */
function drawFooters(page: Page, branding: StatementBranding): void {
  const { doc, left, right } = page;
  const range = doc.bufferedPageRange();
  const support = [
    branding.support_email ? `Email: ${branding.support_email}` : '',
    branding.support_phone ? `Phone: ${branding.support_phone}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const y = doc.page.height - FOOTER_ZONE + 14;
    doc
      .moveTo(left, y - 8)
      .lineTo(right, y - 8)
      .strokeColor(line)
      .stroke();
    doc.fillColor(muted).fontSize(8).font('Helvetica');
    doc.text('This is a computer-generated statement and does not require a signature.', left, y, {
      width: right - left - 90,
      lineBreak: false,
    });
    if (support) doc.text(support, left, y + 12, { width: right - left - 90, lineBreak: false });
    doc.text(`Page ${index + 1} of ${range.count}`, right - 90, y, { width: 90, align: 'right', lineBreak: false });
  }
}

/** Render the statement. The logo is the only asynchronous part and is fetched before drawing starts. */
export async function walletStatementPdf(statement: WalletStatement, branding: StatementBranding): Promise<Buffer> {
  const logo = await loadPdfImage(branding.logo_url);
  return renderPdf(
    (doc) => {
      const left = SIDE;
      const right = doc.page.width - SIDE;
      const page: Page = {
        doc,
        left,
        right,
        bottom: doc.page.height - FOOTER_ZONE,
        columns: columnsFor(left, right, statement.balances_reconciled),
        currency: pdfCurrency(statement.currency_symbol).trim(),
      };
      drawBrandBand(page, branding, logo);
      const metaBottom = drawMeta(page, statement, branding);
      const cardBottom = drawAccountCard(page, statement, metaBottom + 16);
      const tableTop = drawTableHeader(page, cardBottom + 18);
      const rowsBottom = drawRows(page, statement, tableTop);
      drawSummary(page, statement, rowsBottom);
      drawFooters(page, branding);
    },
    { bufferPages: true }
  );
}
