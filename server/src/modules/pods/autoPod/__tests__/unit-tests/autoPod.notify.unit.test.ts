/**
 * Who hears what about an Auto Pod. The audience matching, the pod lookup,
 * the user lookup, the notification gateway and the mailer are all faked;
 * what is under test is the routing — which role is asked next, who counts
 * as a stakeholder (once each, on their own queue), who is left out because
 * they caused the event, and what each push and email says.
 */
import { Types } from 'mongoose';

jest.mock('../../autoPod.audience', () => ({
  audienceVenues: jest.fn(),
  audienceHosts: jest.fn(),
  audienceClubs: jest.fn(),
}));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { findById: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@services/email/email.service', () => ({ sendAutoPodReleasedEmail: jest.fn() }));
jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@utils/app-time', () => ({
  ...jest.requireActual('@utils/app-time'),
  appDateTime: (value?: Date | null) => (value ? `WHEN(${value.toISOString()})` : ''),
}));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.service', () => ({
  podNotificationLink: jest.fn(),
  loadPodClubSlugMap: jest.fn(),
}));

import { audienceClubs, audienceHosts, audienceVenues } from '../../autoPod.audience';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendAutoPodReleasedEmail } from '@services/email/email.service';
import { logs } from '@observability/log';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { loadPodClubSlugMap, podNotificationLink } from '@modules/pods/pod/pod.service';
import { AUTO_POD_LINKS, autoPodNotify, notifyQuietly } from '../../autoPod.notify';
import type { IAutoPod } from '../../autoPod.model';

const create = notificationService.create as jest.Mock;
const venuesAudience = audienceVenues as jest.Mock;
const hostsAudience = audienceHosts as jest.Mock;
const clubsAudience = audienceClubs as jest.Mock;
const podFindById = PodModel.findById as jest.Mock;
const userFindById = UserModel.findById as jest.Mock;
const sendReleased = sendAutoPodReleasedEmail as jest.Mock;
const linkOf = podNotificationLink as jest.Mock;
const slugMap = loadPodClubSlugMap as jest.Mock;
const logError = logs.server.error as jest.Mock;

const SUB = new Types.ObjectId('65c000000000000000000001');
const CITY = new Types.ObjectId('65c000000000000000000002');
const VENUE_OWNER = new Types.ObjectId('65c000000000000000000010');
const HOST = new Types.ObjectId('65c000000000000000000011');
const CLUB_ADMIN = new Types.ObjectId('65c000000000000000000012');
const OPENER = new Types.ObjectId('65c000000000000000000013');
const CLUB = new Types.ObjectId('65c000000000000000000020');
const SLOT_AT = new Date('2026-10-10T12:30:00Z');
const VIRTUAL_AT = new Date('2026-10-12T14:00:00Z');

const location = {
  location_id: CITY,
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE' as const,
  bound_at: new Date('2026-10-01T00:00:00Z'),
};
const venueClaim = {
  venue_id: new Types.ObjectId(),
  venue_slot_id: new Types.ObjectId(),
  owner_user_id: VENUE_OWNER,
  venue_name: 'Play Arena',
  pod_date_time: SLOT_AT,
  pod_end_date_time: null,
  slot_price: 500,
  accepted_at: new Date('2026-10-01T00:00:00Z'),
};
const hostClaim = { user_id: HOST, host_name: 'Asha', assigned_at: new Date('2026-10-01T00:00:00Z') };
const clubClaim = {
  club_id: CLUB,
  club_name: 'Smash Club',
  user_id: CLUB_ADMIN,
  claimed_at: new Date('2026-10-01T00:00:00Z'),
};

const offer = (over: Partial<Record<keyof IAutoPod, unknown>> = {}) =>
  ({
    _id: new Types.ObjectId('65c0000000000000000000ff'),
    auto_pod_no: 'APOD-000042',
    pod_title: 'Sunday Smash',
    pod_mode: 'PHYSICAL',
    is_active: true,
    sub_category_id: SUB,
    location: null,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    created_by: null,
    pod_id: null,
    pod_date_time: null,
    cancel_reason: '',
    ...over,
  }) as unknown as IAutoPod;

/** `findById().select().lean()` as one chain. */
const userChain = (value: unknown) => ({ select: () => ({ lean: () => Promise.resolve(value) }) });

/** Every push as { title, body, link, ids } so a test can find one by title. */
const pushes = () =>
  create.mock.calls.map(([input]) => ({
    title: input.title as string,
    body: input.body as string,
    link: input.link_url as string,
    ids: input.target_user_ids as string[],
  }));

beforeEach(() => {
  create.mockResolvedValue({});
  venuesAudience.mockResolvedValue([]);
  hostsAudience.mockResolvedValue([]);
  clubsAudience.mockResolvedValue([]);
  sendReleased.mockResolvedValue(undefined);
});

describe('AUTO_POD_LINKS', () => {
  it('sends each role to its own queue', () => {
    expect(AUTO_POD_LINKS).toEqual({
      venue: '/venues/auto-pods',
      host: '/host/auto-pods',
      club: '/clubs/auto-pods',
    });
  });
});

describe('autoPodNotify.opened', () => {
  it('asks the matching venues of a fresh physical offer, once per owner', async () => {
    venuesAudience.mockResolvedValue([
      { owner_user_id: 'owner-1' },
      { owner_user_id: 'owner-1' },
      { owner_user_id: '' },
      { owner_user_id: 'owner-2' },
    ]);
    await autoPodNotify.opened(offer());

    expect(venuesAudience).toHaveBeenCalledWith(SUB, null);
    expect(hostsAudience).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      title: 'Auto Pod needs a venue',
      body: '"Sunday Smash" is waiting for a venue. Accept it with one of your slots.',
      scope: 'USER',
      target_user_ids: ['owner-1', 'owner-2'],
      link_url: '/venues/auto-pods',
      silent: false,
    });
  });

  it('asks hosts first on a virtual offer, naming its own date and pinned city', async () => {
    hostsAudience.mockResolvedValue([{ user_id: 'host-1' }]);
    await autoPodNotify.opened(offer({ pod_mode: 'VIRTUAL', pod_date_time: VIRTUAL_AT, location }));

    expect(venuesAudience).not.toHaveBeenCalled();
    expect(hostsAudience).toHaveBeenCalledWith(SUB);
    expect(pushes()).toEqual([
      {
        title: 'Auto Pod needs a host',
        body: `"Sunday Smash" (online on WHEN(${VIRTUAL_AT.toISOString()}) · in Bengaluru, Karnataka) is waiting for a host. Assign yourself to host it.`,
        link: '/host/auto-pods',
        ids: ['host-1'],
      },
    ]);
  });

  it('asks every admin of the matching clubs once a host is on it, in the pinned city', async () => {
    clubsAudience.mockResolvedValue([
      { admin_user_ids: ['admin-1', 'admin-2'] },
      { admin_user_ids: ['admin-2', 'admin-3'] },
    ]);
    await autoPodNotify.opened(offer({ venue_claim: venueClaim, host_claim: hostClaim, location }));

    expect(clubsAudience).toHaveBeenCalledWith(SUB, location);
    expect(pushes()).toEqual([
      {
        title: 'Auto Pod needs a club',
        body: `"Sunday Smash" (at Play Arena on WHEN(${SLOT_AT.toISOString()}) · in Bengaluru, Karnataka) is waiting for a club. Claim it for your club.`,
        link: '/clubs/auto-pods',
        ids: ['admin-1', 'admin-2', 'admin-3'],
      },
    ]);
  });

  it('tells nobody about a paused offer', async () => {
    venuesAudience.mockResolvedValue([{ owner_user_id: 'owner-1' }]);
    await autoPodNotify.opened(offer({ is_active: false }));
    expect(venuesAudience).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('asks nobody once every role is filled', async () => {
    await autoPodNotify.opened(
      offer({ venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim })
    );
    expect(venuesAudience).not.toHaveBeenCalled();
    expect(hostsAudience).not.toHaveBeenCalled();
    expect(clubsAudience).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('sends nothing when the audience is empty', async () => {
    await autoPodNotify.opened(offer());
    expect(venuesAudience).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('propagates a gateway failure to the caller', async () => {
    venuesAudience.mockResolvedValue([{ owner_user_id: 'owner-1' }]);
    create.mockRejectedValue(new Error('gateway down'));
    await expect(autoPodNotify.opened(offer())).rejects.toThrow('gateway down');
  });
});

describe('autoPodNotify.enrolled', () => {
  it('tells the opener which venue accepted (not the venue itself) and asks the hosts', async () => {
    hostsAudience.mockResolvedValue([{ user_id: 'host-1' }]);
    await autoPodNotify.enrolled(offer({ venue_claim: venueClaim, created_by: OPENER }), 'venue');

    expect(pushes()).toEqual(
      expect.arrayContaining([
        {
          title: 'Auto Pod has a venue',
          body: `Play Arena accepted "Sunday Smash" for WHEN(${SLOT_AT.toISOString()}).`,
          link: '/venues/auto-pods',
          ids: [String(OPENER)],
        },
        expect.objectContaining({ title: 'Auto Pod needs a host', ids: ['host-1'] }),
      ])
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(pushes().flatMap((p) => p.ids)).not.toContain(String(VENUE_OWNER));
  });

  it('routes each stakeholder to their own queue, the club-opener once, and skips the actor', async () => {
    const doc = offer({
      venue_claim: venueClaim,
      host_claim: hostClaim,
      club_claim: clubClaim,
      created_by: CLUB_ADMIN,
    });
    await autoPodNotify.enrolled(doc, 'host');

    const rows = pushes();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          title: 'Auto Pod has a host',
          body: 'Asha will host "Sunday Smash".',
          link: '/venues/auto-pods',
          ids: [String(VENUE_OWNER)],
        },
        {
          title: 'Auto Pod has a host',
          body: 'Asha will host "Sunday Smash".',
          link: '/clubs/auto-pods',
          ids: [String(CLUB_ADMIN)],
        },
      ])
    );
    // Complete — nobody is asked for anything more.
    expect(clubsAudience).not.toHaveBeenCalled();
  });

  it('names the club that claimed it to the venue and host', async () => {
    const doc = offer({ venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim });
    await autoPodNotify.enrolled(doc, 'club');

    const rows = pushes();
    expect(rows.map((r) => r.body)).toEqual(['Smash Club claimed "Sunday Smash".', 'Smash Club claimed "Sunday Smash".']);
    expect(rows.flatMap((r) => r.ids).sort()).toEqual([String(HOST), String(VENUE_OWNER)].sort());
    expect(rows.find((r) => r.ids.includes(String(HOST)))?.link).toBe('/host/auto-pods');
  });
});

describe('autoPodNotify.withdrawn', () => {
  it('tells who is left that the role emptied, and asks that role again', async () => {
    hostsAudience.mockResolvedValue([{ user_id: 'host-2' }]);
    await autoPodNotify.withdrawn(offer({ venue_claim: venueClaim, created_by: OPENER }), 'host', '');

    expect(pushes()).toEqual(
      expect.arrayContaining([
        {
          title: 'Auto Pod lost a host',
          body: 'A partner withdrew from "Sunday Smash". It is back on the list for a host.',
          link: '/venues/auto-pods',
          ids: expect.arrayContaining([String(VENUE_OWNER), String(OPENER)]),
        },
        expect.objectContaining({ title: 'Auto Pod needs a host', ids: ['host-2'] }),
      ])
    );
  });

  it('uses the name of whoever left when one is known', async () => {
    await autoPodNotify.withdrawn(offer({ created_by: OPENER }), 'venue', 'Play Arena');
    expect(pushes()[0].body).toBe(
      'Play Arena withdrew from "Sunday Smash". It is back on the list for a venue.'
    );
  });
});

describe('autoPodNotify.live', () => {
  const complete = (over: Record<string, unknown> = {}) =>
    offer({ venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim, ...over });

  it('sends everyone to the materialized pod itself', async () => {
    const podId = new Types.ObjectId();
    const pod = { _id: podId };
    podFindById.mockResolvedValue(pod);
    slugMap.mockResolvedValue(new Map([['c', 'smash-club']]));
    linkOf.mockReturnValue('/smash-club/sunday-smash');

    await autoPodNotify.live(complete({ pod_id: podId }));

    expect(podFindById).toHaveBeenCalledWith(podId);
    expect(linkOf).toHaveBeenCalledWith(pod, new Map([['c', 'smash-club']]));
    expect(pushes()).toEqual([
      {
        title: 'Auto Pod is live',
        body: '"Sunday Smash" is now live and open for bookings.',
        link: '/smash-club/sunday-smash',
        ids: [String(VENUE_OWNER), String(HOST), String(CLUB_ADMIN)],
      },
    ]);
  });

  it('falls back to each queue when the pod is gone', async () => {
    podFindById.mockResolvedValue(null);
    await autoPodNotify.live(complete({ pod_id: new Types.ObjectId() }));
    expect(linkOf).not.toHaveBeenCalled();
    expect(pushes().map((p) => p.link).sort()).toEqual(
      ['/clubs/auto-pods', '/host/auto-pods', '/venues/auto-pods'].sort()
    );
  });

  it('falls back to each queue when there is no pod id or no link', async () => {
    await autoPodNotify.live(complete());
    expect(podFindById).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(3);

    create.mockClear();
    podFindById.mockResolvedValue({ _id: new Types.ObjectId() });
    slugMap.mockResolvedValue(new Map());
    linkOf.mockReturnValue(null);
    await autoPodNotify.live(complete({ pod_id: new Types.ObjectId() }));
    expect(create).toHaveBeenCalledTimes(3);
  });
});

describe('autoPodNotify.cancelled and expired', () => {
  it('quotes the cancel reason when there is one', async () => {
    await autoPodNotify.cancelled(offer({ host_claim: hostClaim, cancel_reason: 'Venue flooded' }));
    expect(pushes()).toEqual([
      {
        title: 'Auto Pod cancelled',
        body: '"Sunday Smash" was cancelled before it went live. Reason: Venue flooded',
        link: '/host/auto-pods',
        ids: [String(HOST)],
      },
    ]);
  });

  it('says only that it was cancelled when no reason was given', async () => {
    await autoPodNotify.cancelled(offer({ host_claim: hostClaim }));
    expect(pushes()[0].body).toBe('"Sunday Smash" was cancelled before it went live.');
  });

  it('sends nothing when nobody is on the offer', async () => {
    await autoPodNotify.cancelled(offer());
    expect(create).not.toHaveBeenCalled();
  });

  it('explains an expiry by its date', async () => {
    await autoPodNotify.expired(offer({ venue_claim: venueClaim }));
    expect(pushes()).toEqual([
      {
        title: 'Auto Pod expired',
        body: '"Sunday Smash" expired because its date passed before everyone enrolled.',
        link: '/venues/auto-pods',
        ids: [String(VENUE_OWNER)],
      },
    ]);
  });
});

describe('autoPodNotify.released', () => {
  it('pushes every stakeholder and emails each enrolled partner with their part', async () => {
    userFindById.mockImplementation((id: string) => {
      if (id === String(VENUE_OWNER)) {
        return userChain({ profile: { first_name: 'Ravi', last_name: 'Kumar' }, auth: { email: 'venue@example.com' } });
      }
      if (id === String(HOST)) return userChain({ profile: {}, auth: { email: 'host@example.com' } });
      return userChain(null);
    });
    const doc = offer({ venue_claim: venueClaim, host_claim: hostClaim, created_by: OPENER });

    await autoPodNotify.released(doc, 48);

    expect(pushes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Auto Pod released',
          body: '"Sunday Smash" was released — not fully assigned within 48 hours. Still waiting on a club.',
        }),
      ])
    );
    expect(pushes().flatMap((p) => p.ids).sort()).toEqual(
      [String(VENUE_OWNER), String(HOST), String(OPENER)].sort()
    );
    expect(sendReleased).toHaveBeenCalledTimes(2);
    expect(sendReleased).toHaveBeenCalledWith({
      to: 'venue@example.com',
      name: 'Ravi Kumar',
      pod_title: 'Sunday Smash',
      auto_pod_no: 'APOD-000042',
      hours: 48,
      missing: ['club'],
      part: 'venue',
    });
    expect(sendReleased).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'host@example.com', name: 'there', part: 'host' })
    );
  });

  it('lists every missing role and skips a partner with no email', async () => {
    userFindById.mockReturnValue(userChain({ profile: { first_name: 'No' }, auth: {} }));
    await autoPodNotify.released(offer({ host_claim: hostClaim }), 24);

    expect(pushes()[0].body).toBe(
      '"Sunday Smash" was released — not fully assigned within 24 hours. Still waiting on a venue, a club.'
    );
    expect(userFindById).toHaveBeenCalledWith(String(HOST));
    expect(sendReleased).not.toHaveBeenCalled();
  });

  it('emails the club admin who had claimed it', async () => {
    userFindById.mockReturnValue(
      userChain({ profile: { first_name: 'Meera', last_name: '' }, auth: { email: 'club@example.com' } })
    );
    await autoPodNotify.released(offer({ club_claim: clubClaim, pod_mode: 'VIRTUAL' }), 12);
    expect(sendReleased).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'club@example.com', name: 'Meera', part: 'club', missing: ['host'] })
    );
  });
});

describe('notifyQuietly', () => {
  it('logs a failed notification instead of throwing', async () => {
    const error = new Error('push failed');
    notifyQuietly(Promise.reject(error), 'notifyOpened', 'auto-1');
    await new Promise((resolve) => setImmediate(resolve));
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyOpened', { error, auto_pod_id: 'auto-1' });
  });

  it('logs nothing when the notification went out', async () => {
    notifyQuietly(Promise.resolve(), 'notifyOpened', 'auto-1');
    await new Promise((resolve) => setImmediate(resolve));
    expect(logError).not.toHaveBeenCalled();
  });
});
