/**
 * The pieces of the Security Verification screen, one at a time: what each one
 * says, what it refuses to say as fact (an address is only an approximate
 * place), and what each state of the location and the alternative looks like.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/app-settings', async (orig) => ({
  ...(await orig<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: string) => `FMT(${value})` }),
}));

import { AlternativePanel } from '../src/security-verification/AlternativePanel';
import { ConsentChecklist } from '../src/security-verification/ConsentChecklist';
import { DetectedDetails } from '../src/security-verification/DetectedDetails';
import { LocationPanel } from '../src/security-verification/LocationPanel';
import { PolicySections } from '../src/security-verification/PolicySections';
import { SecurityLocationMap } from '../src/security-verification/SecurityLocationMap';
import { SecurityWarningBanner } from '../src/security-verification/SecurityWarningBanner';
import { AlternativeVerificationForm } from '../src/security-verification/alternative-verification';
import type { Detected, ExceptionStatus } from '../src/security-verification/documents';

const detected = (over: Partial<Detected> = {}): Detected => ({
  ip: '203.0.113.9',
  country: 'IN',
  region: 'KA',
  city: 'Bengaluru',
  ip_location_is_approximate: true,
  browser: 'Chrome',
  os: 'Windows',
  device_type: 'DESKTOP',
  user_agent: 'Mozilla/5.0',
  server_time: '2026-11-23T10:00:00.000Z',
  ...over,
});

const exception = (over: Partial<ExceptionStatus> = {}): ExceptionStatus => ({
  id: 'ex-1',
  status: 'PENDING',
  reason: 'My laptop has no location service',
  decision_note: null,
  created_at: '2026-11-23T10:00:00.000Z',
  decided_at: null,
  expires_at: null,
  ...over,
});

describe('SecurityWarningBanner', () => {
  it('opens with the warning, in full, as an alert', () => {
    render(<SecurityWarningBanner />);
    const banner = screen.getByTestId('security-warning-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveTextContent('SECURITY WARNING:');
    expect(banner).toHaveTextContent(
      "Your IP address, location, device details, and login activity are recorded and securely stored on Duncit's servers",
    );
    expect(banner).toHaveTextContent('you must immediately close this page and discontinue access');
    expect(banner).toHaveTextContent('account suspension, security investigation, and legal action under applicable laws');
  });
});

describe('DetectedDetails', () => {
  it('lists what the server sees, and marks the place as approximate', () => {
    render(<DetectedDetails detected={detected()} userName="Asha Rao" />);
    expect(screen.getByTestId('security-detected-person')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('security-detected-ip')).toHaveTextContent('203.0.113.9');
    expect(screen.getByTestId('security-detected-place')).toHaveTextContent('Bengaluru, KA, IN');
    expect(screen.getByTestId('security-detected-device')).toHaveTextContent('DESKTOP');
    expect(screen.getByTestId('security-detected-browser')).toHaveTextContent('Chrome');
    expect(screen.getByTestId('security-detected-os')).toHaveTextContent('Windows');
    expect(screen.getByTestId('security-detected-time')).toHaveTextContent('FMT(2026-11-23T10:00:00.000Z)');
    // Never presented as a GPS position.
    expect(screen.getByText('Approximate')).toBeInTheDocument();
    expect(screen.getByText(/not your GPS position/)).toBeInTheDocument();
  });

  it('says "not available" for what could not be worked out, rather than leaving a blank', () => {
    render(
      <DetectedDetails
        detected={detected({ ip: null, city: null, region: null, country: null, browser: null, os: null, device_type: null })}
        userName="Asha Rao"
      />,
    );
    for (const id of ['ip', 'place', 'device', 'browser', 'os']) {
      expect(screen.getByTestId(`security-detected-${id}`)).toHaveTextContent('Not available');
    }
  });

  it('writes only the parts of the place that are known', () => {
    render(<DetectedDetails detected={detected({ city: null, region: null })} userName="Asha Rao" />);
    expect(screen.getByTestId('security-detected-place')).toHaveTextContent(/^IN$/);
  });
});

describe('PolicySections', () => {
  const sections = [
    { key: 'security', title: 'Security policy', paragraphs: ['First paragraph.', 'Second paragraph.'] },
    { key: 'access', title: 'Access policy', paragraphs: ['Only approved people.'] },
  ];

  it('shows every section in order, open, inside a scroll region the keyboard can move through, with the full-policy links', () => {
    render(
      <PolicySections
        sections={sections}
        links={[{ title: 'Privacy Policy', policy_type: 'Privacy Policy', url: 'https://m.duncit.com/policies/privacy' }]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Security, access and privacy policies' });
    // Each section header is a button, so the keyboard can move through (and so scroll) the region.
    const headers = within(region).getAllByRole('button');
    expect(headers.map((header) => header.textContent)).toEqual(['Security policy', 'Access policy']);
    headers.forEach((header) => expect(header).toHaveAttribute('aria-expanded', 'true'));
    const headings = within(region).getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Security policy', 'Access policy']);
    expect(within(region).getByText('Second paragraph.')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Privacy Policy/ });
    expect(link).toHaveAttribute('href', 'https://m.duncit.com/policies/privacy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('lets a section be folded away, and says that it is', async () => {
    render(<PolicySections sections={sections} links={[]} />);
    const header = screen.getByRole('button', { name: 'Access policy' });

    await userEvent.setup().click(header);

    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Security policy' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves the links heading out when Legal has published none', () => {
    render(<PolicySections sections={sections} links={[]} />);
    expect(screen.queryByTestId('security-policy-links')).not.toBeInTheDocument();
  });
});

describe('ConsentChecklist', () => {
  /** The checkbox inside one confirmation's row. */
  const boxOf = (testId: string) => within(screen.getByTestId(testId)).getByRole('checkbox');
  const none = { authorized_person: false, credentials_not_shared: false, policies_acknowledged: false, location_consent: false };

  it('offers the four confirmations in the agreed words, all unticked', () => {
    render(<ConsentChecklist consent={none} onChange={vi.fn()} locationNotNeeded={false} disabled={false} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(4);
    boxes.forEach((box) => expect(box).not.toBeChecked());
    expect(screen.getByLabelText(/authorized Duncit employee or explicitly approved personnel/)).toBeInTheDocument();
    expect(screen.getByLabelText(/not shared my login credentials or password with anyone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/security monitoring, IP logging, location collection, and applicable privacy policies/)).toBeInTheDocument();
    expect(screen.getByLabelText(/voluntarily consent to sharing my current location/)).toBeInTheDocument();
  });

  it('reports which box was changed, and to what', async () => {
    const onChange = vi.fn();
    render(<ConsentChecklist consent={none} onChange={onChange} locationNotNeeded={false} disabled={false} />);
    await userEvent.setup().click(screen.getByTestId('security-consent-credentials'));
    expect(onChange).toHaveBeenCalledWith('credentials_not_shared', true);
  });

  it('shows what is ticked', () => {
    render(
      <ConsentChecklist consent={{ ...none, policies_acknowledged: true }} onChange={vi.fn()} locationNotNeeded={false} disabled={false} />,
    );
    expect(boxOf('security-consent-policies')).toBeChecked();
    expect(boxOf('security-consent-authorized')).not.toBeChecked();
  });

  it('locks every box while the verification is being sent', () => {
    render(<ConsentChecklist consent={none} onChange={vi.fn()} locationNotNeeded={false} disabled />);
    screen.getAllByRole('checkbox').forEach((box) => expect(box).toBeDisabled());
  });

  it('switches the location box off, and says why, when an administrator approved another way', () => {
    render(<ConsentChecklist consent={none} onChange={vi.fn()} locationNotNeeded disabled={false} />);
    expect(boxOf('security-consent-location')).toBeDisabled();
    expect(boxOf('security-consent-authorized')).toBeEnabled();
    expect(screen.getByText(/approved another way for you to verify/)).toBeInTheDocument();
  });
});

describe('SecurityLocationMap', () => {
  const frame = () => screen.getByTitle('Where you are') as HTMLIFrameElement;

  it('pins the position in an embedded map and writes down the accuracy beside it', () => {
    render(<SecurityLocationMap latitude={12.971599} longitude={77.594566} accuracyMeters={18.4} title="Where you are" />);
    expect(frame().src).toContain('maps.google.com/maps?q=12.971599%2C77.594566');
    expect(frame().src).toContain('output=embed');
    expect(screen.getByText('Coordinates 12.97160, 77.59457 · accurate to about 18 m')).toBeInTheDocument();
    const open = screen.getByRole('link', { name: /Open in Google Maps/ });
    expect(open).toHaveAttribute('href', expect.stringContaining('query=12.971599%2C77.594566'));
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    [null, '15'],
    [10, '17'],
    [50, '17'],
    [51, '15'],
    [500, '15'],
    [501, '13'],
    [5000, '13'],
    [5001, '11'],
  ])('zooms for an accuracy of %s metres to level %s', (accuracy, zoom) => {
    render(<SecurityLocationMap latitude={1} longitude={2} accuracyMeters={accuracy} title="Where you are" />);
    expect(frame().src).toContain(`&z=${zoom}&`);
  });

  it('does not claim an accuracy it was not given', () => {
    render(<SecurityLocationMap latitude={1} longitude={2} title="Where you are" />);
    expect(screen.getByText('Coordinates 1.00000, 2.00000')).toBeInTheDocument();
    expect(screen.queryByText(/accurate to about/)).not.toBeInTheDocument();
  });
});

describe('AlternativeVerificationForm', () => {
  it('asks why, and refuses a reason too short for an administrator to act on', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AlternativeVerificationForm onSubmit={onSubmit} busy={false} />);
    const u = userEvent.setup();

    await u.type(screen.getByLabelText(/Why can you not share your location/), 'no');
    await u.click(screen.getByTestId('security-alternative-submit'));

    expect(await screen.findByText('Tell the administrator why in at least 10 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a reason that is too long', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AlternativeVerificationForm onSubmit={onSubmit} busy={false} />);
    const u = userEvent.setup();

    await u.click(screen.getByLabelText(/Why can you not share your location/));
    await u.paste('x'.repeat(501));
    await u.click(screen.getByTestId('security-alternative-submit'));

    expect(await screen.findByText('Keep it within 500 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the reason, trimmed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AlternativeVerificationForm onSubmit={onSubmit} busy={false} />);
    const u = userEvent.setup();

    await u.type(screen.getByLabelText(/Why can you not share your location/), '  My laptop has no location service  ');
    await u.click(screen.getByTestId('security-alternative-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('My laptop has no location service'));
  });

  it('keeps what was typed when the request is refused, without throwing', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('refused'));
    render(<AlternativeVerificationForm onSubmit={onSubmit} busy={false} />);
    const u = userEvent.setup();
    const box = screen.getByLabelText(/Why can you not share your location/);

    await u.type(box, 'A perfectly good reason');
    await u.click(screen.getByTestId('security-alternative-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(box).toHaveValue('A perfectly good reason');
  });

  it('cannot be pressed again while the request is being sent', () => {
    render(<AlternativeVerificationForm onSubmit={vi.fn()} busy />);
    expect(screen.getByTestId('security-alternative-submit')).toBeDisabled();
    expect(screen.getByTestId('security-alternative-submit')).toHaveTextContent('Sending…');
  });
});

describe('AlternativePanel', () => {
  const panel = (current: ExceptionStatus | null, over: { busy?: boolean; error?: string | null } = {}) =>
    render(
      <AlternativePanel exception={current} busy={over.busy ?? false} error={over.error ?? null} onRequest={vi.fn().mockResolvedValue(undefined)} />,
    );

  it('explains the way out and offers the form when nothing has been asked yet', () => {
    panel(null);
    expect(screen.getByText('Cannot share your location?')).toBeInTheDocument();
    expect(screen.getByTestId('security-alternative-form')).toBeInTheDocument();
    expect(screen.queryByTestId('security-alternative-pending')).not.toBeInTheDocument();
  });

  it('says the request is with an administrator, and does not offer a second one', () => {
    panel(exception({ status: 'PENDING' }));
    expect(screen.getByTestId('security-alternative-pending')).toHaveTextContent('Your request is with an administrator');
    expect(screen.queryByTestId('security-alternative-form')).not.toBeInTheDocument();
  });

  it('says it was approved, until when, and does not offer another request', () => {
    panel(exception({ status: 'APPROVED', expires_at: '2026-11-24T10:00:00.000Z' }));
    expect(screen.getByTestId('security-alternative-approved')).toHaveTextContent('Valid until FMT(2026-11-24T10:00:00.000Z)');
    expect(screen.queryByTestId('security-alternative-form')).not.toBeInTheDocument();
  });

  it('copes with an approval that has no end time recorded', () => {
    panel(exception({ status: 'APPROVED', expires_at: null }));
    expect(screen.getByTestId('security-alternative-approved')).toBeInTheDocument();
  });

  it('says a rejection was a rejection, with the administrator\'s note when there is one, and allows asking again', () => {
    const { unmount } = panel(exception({ status: 'REJECTED' }));
    expect(screen.getByTestId('security-alternative-rejected')).toHaveTextContent('An administrator did not approve this request.');
    expect(screen.getByTestId('security-alternative-form')).toBeInTheDocument();
    unmount();

    panel(exception({ status: 'REJECTED', decision_note: 'Come to the office' }));
    expect(screen.getByTestId('security-alternative-rejected')).toHaveTextContent('Come to the office');
  });

  it.each(['USED', 'EXPIRED'] as const)('says an approval that is %s is over, and allows asking again', (status) => {
    panel(exception({ status }));
    expect(screen.getByText(/has been used or has run out/)).toBeInTheDocument();
    expect(screen.getByTestId('security-alternative-form')).toBeInTheDocument();
  });

  it('shows why a request failed', () => {
    panel(null, { error: 'Too many requests' });
    expect(screen.getByTestId('security-alternative-error')).toHaveTextContent('Too many requests');
  });
});

describe('LocationPanel', () => {
  const FIX = { latitude: 12.9716, longitude: 77.5946, accuracy: 18.5 };
  const mount = (over: Partial<Parameters<typeof LocationPanel>[0]> = {}) => {
    const onRequest = vi.fn();
    render(
      <LocationPanel
        status="idle"
        fix={null}
        onRequest={onRequest}
        exception={null}
        alternativeBusy={false}
        alternativeError={null}
        onRequestAlternative={vi.fn().mockResolvedValue(undefined)}
        {...over}
      />,
    );
    return onRequest;
  };

  it('asks for the location with a button, and shows an empty map until there is a fix', async () => {
    const onRequest = mount();
    expect(screen.getByText(/Your location will appear here/)).toBeInTheDocument();
    expect(screen.queryByTestId('security-location-map')).not.toBeInTheDocument();
    expect(screen.queryByTestId('security-alternative')).not.toBeInTheDocument();

    const button = screen.getByTestId('security-location-request');
    expect(button).toHaveTextContent('Share my current location');
    await userEvent.setup().click(button);
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('waits visibly while the browser asks', () => {
    mount({ status: 'requesting' });
    expect(screen.getByTestId('security-location-request')).toBeDisabled();
    expect(screen.getByTestId('security-location-request')).toHaveTextContent('Waiting for your browser…');
  });

  it('shows the fix on the map with a confirmation, and lets the person refresh it', () => {
    mount({ status: 'granted', fix: FIX });
    expect(screen.getByTestId('security-location-map')).toBeInTheDocument();
    expect(screen.getByTestId('security-location-granted')).toBeInTheDocument();
    expect(screen.getByTestId('security-location-request')).toHaveTextContent('Update my location');
    expect(screen.queryByTestId('security-location-failed')).not.toBeInTheDocument();
  });

  it.each([
    ['denied', /Location access was blocked/],
    ['unavailable', /could not work out your location/],
    ['timeout', /took too long/],
    ['unsupported', /cannot share a location/],
  ] as const)('explains a %s request, states the restriction, and offers the alternative — never a skip', (status, message) => {
    mount({ status });
    expect(screen.getByTestId('security-location-failed')).toHaveTextContent(message);
    expect(screen.getByTestId('security-location-restriction')).toHaveTextContent(/cannot open this portal without location verification/);
    expect(screen.getByTestId('security-alternative')).toBeInTheDocument();
    expect(screen.getByTestId('security-location-request')).toHaveTextContent('Try sharing again');
  });

  it('cannot retry in a browser that cannot share a location at all', () => {
    mount({ status: 'unsupported' });
    expect(screen.getByTestId('security-location-request')).toBeDisabled();
  });

  it('keeps showing an alternative that was already asked for, even once a fix exists', () => {
    mount({ status: 'granted', fix: FIX, exception: exception({ status: 'PENDING' }) });
    expect(screen.getByTestId('security-alternative-pending')).toBeInTheDocument();
  });
});
