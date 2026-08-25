import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TemplateUsageStrip, {
  logsHref,
} from '../../src/pages/email-templates-page/TemplateUsageStrip';
import type { TemplateUsage } from '../../src/pages/email-templates-page/queries';

const usage = (over: Partial<TemplateUsage> = {}): TemplateUsage => ({
  slug: 'pod-backout-spot-filled',
  sent: 128,
  skipped: 0,
  failed: 0,
  total: 128,
  last_sent_at: '2026-08-24T12:30:00.000Z',
  last_attempt_at: '2026-08-24T12:30:00.000Z',
  ...over,
});

const renderStrip = (value: TemplateUsage | null) =>
  render(
    <MemoryRouter>
      <TemplateUsageStrip slug="pod-backout-spot-filled" usage={value} />
    </MemoryRouter>
  );

describe('logsHref', () => {
  it('narrows Email Logs to one template, with and without a status', () => {
    expect(logsHref('welcome')).toBe('/emails/logs?template=welcome');
    expect(logsHref('welcome', 'FAILED')).toBe('/emails/logs?template=welcome&status=FAILED');
  });

  it('escapes a slug rather than pasting it into the query string raw', () => {
    expect(logsHref('a b&c')).toBe('/emails/logs?template=a+b%26c');
  });
});

describe('TemplateUsageStrip', () => {
  it('shows the send count as a link into the log that produced it', () => {
    renderStrip(usage());
    const link = screen.getByRole('link', { name: 'Open Sent 128 in Email Logs' });
    expect(link).toHaveAttribute(
      'href',
      '/emails/logs?template=pod-backout-spot-filled&status=SENT'
    );
    // The visible text is the bare metric; the long form is only the name a
    // screen reader reads, so the strip stays scannable.
    expect(link).toHaveTextContent('Sent 128');
  });

  it('hides the failed and skipped chips when there are none of either', () => {
    renderStrip(usage());
    expect(screen.queryByText(/^Failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Skipped/)).not.toBeInTheDocument();
  });

  it('links a failed and a skipped count to their own filtered views', () => {
    renderStrip(usage({ sent: 3, failed: 7, skipped: 2, total: 12 }));
    expect(screen.getByRole('link', { name: 'Open Failed 7 in Email Logs' })).toHaveAttribute(
      'href',
      '/emails/logs?template=pod-backout-spot-filled&status=FAILED'
    );
    expect(screen.getByRole('link', { name: 'Open Skipped 2 in Email Logs' })).toHaveAttribute(
      'href',
      '/emails/logs?template=pod-backout-spot-filled&status=SKIPPED'
    );
    // Three links to three different views must not answer to one name.
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('still offers the zero as a link, so an unused template can be proved unused', () => {
    renderStrip(null);
    expect(screen.getByRole('link', { name: 'Open Sent 0 in Email Logs' })).toBeInTheDocument();
    expect(screen.getByText('Never used')).toBeInTheDocument();
  });

  it('says never used when the roll-up has the template but no rows for it', () => {
    renderStrip(usage({ sent: 0, total: 0, last_sent_at: null, last_attempt_at: null }));
    expect(screen.getByText('Never used')).toBeInTheDocument();
  });

  it('separates "never used" from "only ever failed" — the second is a fault', () => {
    renderStrip(usage({ sent: 0, failed: 40, total: 40, last_sent_at: null }));
    expect(screen.queryByText('Never used')).not.toBeInTheDocument();
    expect(screen.getByText(/^Never sent — last attempt /)).toBeInTheDocument();
  });

  it('dates the last real send, not the last attempt', () => {
    renderStrip(usage({ sent: 5, failed: 1, total: 6, last_attempt_at: '2026-08-25T09:00:00.000Z' }));
    expect(screen.getByText(/^Last sent /)).toBeInTheDocument();
  });
});
