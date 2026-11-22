/**
 * The monthly messages: positional params in the registry's order, per-month
 * entity ids (the dedupe key), and an admin email list that escapes what
 * members typed.
 */
jest.mock('@services/email/email-i18n', () => ({
  emailTranslationVars: jest.fn(async () => ({
    't:email.hostMonthlyPerformance.guidanceMet': 'Target reached.',
    't:email.hostMonthlyPerformance.guidanceBelow': 'Run {{count}} more pods.',
  })),
}));

import {
  attentionHtml,
  clubAdminAlertMessage,
  hostMonthlyMessage,
  type ClubMonth,
  type HostMonthResult,
} from '../../hostPerformance.notify';

const month: ClubMonth = {
  clubId: 'club1',
  clubName: 'Noida Badminton',
  period: '2026-10',
  monthLabel: 'October 2026',
  hostsUrl: 'https://partners.example/club-admin/clubs/club1/hosts',
  createPodUrl: 'https://mweb.example/create-pod',
};

const result = (over: Partial<HostMonthResult> = {}): HostMonthResult => ({
  clubId: 'club1',
  hostId: 'host1',
  completed: 5,
  target: 8,
  score: 63,
  lastPodAt: null,
  inactive: false,
  underperforming: true,
  ...over,
});

const host = { _id: 'host1', profile: { first_name: 'Meera', last_name: 'Nair' }, auth: { email: 'm@x.com' } };

describe('hostMonthlyMessage', () => {
  it('fills the eight params in order with a per-host, per-club, per-month entity id', async () => {
    const msg = await hostMonthlyMessage(month, result(), host);
    expect(msg.event).toBe('HOST_MONTHLY_PERFORMANCE');
    expect(msg.entityId).toBe('host1:club1:2026-10');
    expect(msg.params).toEqual([
      'Meera Nair',
      'Noida Badminton',
      'October 2026',
      8,
      5,
      '63%',
      'Run 3 more pods.',
      'https://mweb.example/create-pod',
    ]);
  });

  it('praises a host who met the target', async () => {
    const msg = await hostMonthlyMessage(month, result({ completed: 9, score: 100, underperforming: false }), host);
    expect(msg.params[6]).toBe('Target reached.');
  });
});

describe('clubAdminAlertMessage', () => {
  const users = new Map<string, Record<string, any>>([
    ['host1', { profile: { first_name: '<b>Eve</b>' }, auth: { email: 'eve@x.com', phone: { extension: '91', number: '98765' } } }],
    ['host2', { profile: { first_name: 'Raj' }, communication: { whatsapp: { extension: '+91', number: '11111' } } }],
  ]);
  const attention = [
    result({ hostId: 'host1', inactive: false, underperforming: true, score: 50 }),
    result({ hostId: 'host2', inactive: true, underperforming: true, score: 0, completed: 0 }),
  ];
  const admin = { _id: 'admin1', profile: { first_name: 'Rohit' } };

  it('counts attention, inactive and below-target hosts, keyed per admin per club per month', () => {
    const msg = clubAdminAlertMessage(month, attention, admin, users);
    expect(msg.event).toBe('CLUB_ADMIN_HOST_PERFORMANCE_ALERT');
    expect(msg.entityId).toBe('admin1:club1:2026-10');
    expect(msg.params).toEqual(['Rohit', 'Noida Badminton', 'October 2026', 2, 1, 2, month.hostsUrl]);
    expect(msg.vars?.target).toBe('8');
  });

  it('lists inactive hosts first, escapes names and leaves labels for the reader’s locale', () => {
    const html = attentionHtml(attention, users);
    expect(html.indexOf('Raj')).toBeLessThan(html.indexOf('Eve'));
    expect(html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
    expect(html).not.toContain('<b>Eve</b>');
    expect(html).toContain('+91 98765');
    expect(html).toContain('+91 11111');
    expect(html).toContain('{{t:email.hostPerformance.actionInactive}}');
    expect(html).toContain('{{t:email.hostPerformance.noPodYet}}');
  });

  it('caps the list and counts the rest', () => {
    const many = Array.from({ length: 30 }, (_, i) => result({ hostId: `h${i}` }));
    const html = attentionHtml(many, new Map());
    expect(html).toContain('{{t:email.hostPerformance.moreHosts}} 5');
  });
});
