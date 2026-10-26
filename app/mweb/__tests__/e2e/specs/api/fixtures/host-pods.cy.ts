/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { expectAnswer, foreignVenueId, marked, refusal } from '../../../support/api-apps';
import {
  createOwnFreePod,
  ensureFreePod,
  ensureOpenSlot,
  FIXTURE_CAPACITY,
  signInRunPartner,
  utcDayAt,
  type FixtureWorld,
} from '../../../support/fixture-world';
import { runAccount } from '../../../support/run-account';

/**
 * Host pods, run by the approved host the run account became. Scenario map:
 * Partners › Host pods ("Create pod refused by the server"); Apps › Host -
 * manage pods, Host - cancel pod ("Cancel a pod nobody else joined", "Cancel
 * refused for ended pods and non-hosts"), Host - attendance ("Open the
 * attendance board"); Partners › Host editor ("Server-side date of birth range").
 *
 * pod.write.ts createForPartner checks the host, then the venue (a pod without
 * a slot may only sit at one of the host's own approved venues), then create
 * checks the image, the price of a FREE pod and the date. hostUpdate checks
 * the title, description and image, and pod.capacity.ts only lets a host grow a
 * live pod up to its booked space. pod.cancellation.ts hostRemove needs one of
 * the listed reasons (and a note for "Other"), then frees the slot. The run's
 * free pod is only read here; every write lands on a second pod made for this
 * spec, which it cancels, and whose slot it deletes.
 */

const bad = (message: string) => refusal('BAD_USER_INPUT', message);

const CREATE = `mutation E2eFixtureHostCreate($input: CreatePodInput!) { createPartnerPod(input: $input) { id } }`;
const MEDIA = `query E2eFixtureHostPodMedia($id: ID!) {
  pod(pod_doc_id: $id) { venue_slot_id pod_images_and_videos { url type } }
}`;
const UPDATE = `mutation E2eFixtureHostUpdate($id: ID!, $input: HostUpdatePodInput!) {
  hostUpdatePod(pod_doc_id: $id, input: $input) { id pod_description no_of_spots }
}`;
const LIMITS = `query E2eFixtureHostSpots($id: ID!) {
  podSpotLimits(pod_doc_id: $id) { current min max seats_taken venue_capacity can_decrease }
}`;
const BOARD = `query E2eFixtureHostBoard($id: ID!) {
  podAttendanceBoard(pod_doc_id: $id) { pod_id pod_type viewer marked_count }
}`;
const PREVIEW = `query E2eFixtureHostPreview($id: ID!) {
  podSettlementPreview(pod_id: $id, venue_bill_amount: 0) { pod_id collected_total }
}`;
const IMPACT = `query E2eFixtureHostImpact($id: ID!) {
  hostPodDeleteImpact(pod_doc_id: $id) { other_attendee_count refundable_payment_count refund_total }
}`;
const CANCEL = `mutation E2eFixtureHostCancel($id: ID!, $subject: String!, $note: String) {
  hostDeletePod(pod_doc_id: $id, reason_subject: $subject, reason_note: $note)
}`;
const HOST_PODS = `query E2eFixtureHostPods { myHostPods { id pod_title } }`;
const SLOTS = `query E2eFixtureHostSlots($venue: ID!) { venueSlots(venue_id: $venue) { id status booked_by_pod_id } }`;
const DELETE_SLOT = `mutation E2eFixtureHostSlotDelete($id: ID!) { deleteVenueSlot(slot_id: $id) }`;
const HOST_STEP1 = `mutation E2eFixtureHostDob($input: HostStep1Input!) { submitHostStep1(input: $input) { id } }`;

describe('API · Host pods: the approved host’s own pods', { testIsolation: false }, () => {
  let token = '';
  let world: FixtureWorld;
  let podId = '';
  let slotId = '';
  let media: Array<{ url: string; type: string }> = [];

  /** A FREE pod at the run's own venue without a slot, with `extra` laid over it. */
  const podInput = (extra: Record<string, unknown>) => ({
    pod_title: marked('rejected pod'),
    pod_description: marked('rejected pod description'),
    pod_hosts_id: [world.userId],
    club_id: world.club.id,
    venue_id: world.venue.id,
    pod_mode: 'PHYSICAL',
    pod_type: 'FREE',
    pod_amount: 0,
    no_of_spots: 4,
    pod_date_time: utcDayAt(17, 10),
    pod_images_and_videos: media,
    ...extra,
  });
  const edit = (extra: Record<string, unknown>) => ({
    pod_title: marked('pod to cancel'),
    pod_description: marked('pod to cancel, edited'),
    pod_images_and_videos: media,
    ...extra,
  });

  before(() => {
    signInRunPartner().then((partner) => {
      ensureFreePod(partner).then((built) => {
        world = built;
        cy.gql(MEDIA, { id: built.pod.id }, { token: partner }).then(({ pod }) => {
          media = pod.pod_images_and_videos;
        });
        const title = marked('pod to cancel');
        cy.gql<{ myHostPods: Array<{ id: string; pod_title: string }> }>(HOST_PODS, {}, { token: partner }).then(
          ({ myHostPods }) => {
            const found = myHostPods.find((row) => row.pod_title === title);
            if (found) {
              podId = found.id;
              return;
            }
            const plan = { note: marked('cancel pod slot'), days: 16, hour: 10 };
            ensureOpenSlot(partner, built.venue.id, plan).then((slot) =>
              createOwnFreePod(partner, built, title, slot).then((pod) => {
                podId = pod.id;
              }),
            );
          },
        );
      });
    });
    signInRunPartner().then((partner) => {
      token = partner;
      cy.gql(MEDIA, { id: podId }, { token: partner }).then(({ pod }) => {
        slotId = pod.venue_slot_id;
      });
    });
  });

  it('HPD-01 a pod with no image, a priced free pod or a past date is refused, even from the approved host', () => {
    cy.gqlRaw(CREATE, { input: podInput({ pod_images_and_videos: [] }) }, { token }).then((body) =>
      expectRefused('createPartnerPod', body, bad('At least one pod image is required')),
    );
    cy.gqlRaw(CREATE, { input: podInput({ pod_amount: 100 }) }, { token }).then((body) =>
      expectRefused('createPartnerPod', body, bad('Free pods must have amount 0')),
    );
    cy.gqlRaw(CREATE, { input: podInput({ pod_date_time: utcDayAt(-3, 10) }) }, { token }).then((body) =>
      expectRefused('createPartnerPod', body, bad('Start date/time must be after current date/time')),
    );
  });

  it('HPD-02 without a slot, a pod may only sit at one of the host’s own approved venues', () => {
    foreignVenueId(token, world.userId).then((foreign) => {
      cy.gqlRaw(CREATE, { input: podInput({ venue_id: foreign }) }, { token }).then((body) =>
        expectRefused('createPartnerPod', body, bad('Select one of your approved venues')),
      );
    });
  });

  it('HPD-03 the host reads its free pod’s board, settlement and cancel impact', () => {
    const board = { pod_id: world.pod.id, pod_type: 'FREE', viewer: 'HOST', marked_count: 0 };
    cy.gqlRaw(BOARD, { id: world.pod.id }, { token }).then((body) => expectAnswer('podAttendanceBoard', body, board));
    cy.gqlRaw(PREVIEW, { id: world.pod.id }, { token }).then((body) =>
      expectAnswer('podSettlementPreview', body, { pod_id: world.pod.id, collected_total: 0 }),
    );
    const impact = { other_attendee_count: 0, refundable_payment_count: 0, refund_total: 0 };
    cy.gqlRaw(IMPACT, { id: world.pod.id }, { token }).then((body) => expectAnswer('hostPodDeleteImpact', body, impact));
  });

  it('HPD-04 an edit needs a title, a description and an image, and is saved when it has them', () => {
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ pod_title: 'ab' }) }, { token }).then((body) =>
      expectRefused('hostUpdatePod', body, bad('Title is too short')),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ pod_description: '  ' }) }, { token }).then((body) =>
      expectRefused('hostUpdatePod', body, bad('Description is required')),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ pod_images_and_videos: [] }) }, { token }).then((body) =>
      expectRefused('hostUpdatePod', body, bad('At least one pod image is required')),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({}) }, { token }).then((body) =>
      expectAnswer('hostUpdatePod', body, {
        id: podId,
        pod_description: marked('pod to cancel, edited'),
        no_of_spots: FIXTURE_CAPACITY / 2,
      }),
    );
  });

  it('HPD-05 a host may only grow a live pod, and never past the space it booked', () => {
    const half = FIXTURE_CAPACITY / 2;
    cy.gqlRaw(LIMITS, { id: podId }, { token }).then((body) =>
      expectAnswer('podSpotLimits', body, {
        current: half,
        min: half,
        max: FIXTURE_CAPACITY,
        seats_taken: 1,
        venue_capacity: FIXTURE_CAPACITY,
        can_decrease: false,
      }),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ no_of_spots: half - 1 }) }, { token }).then((body) =>
      expectRefused(
        'hostUpdatePod',
        body,
        bad('A live pod’s spots can only be increased — ask your Club Admin to reduce them'),
      ),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ no_of_spots: FIXTURE_CAPACITY + 1 }) }, { token }).then((body) =>
      expectRefused(
        'hostUpdatePod',
        body,
        bad(`The booked space holds ${FIXTURE_CAPACITY} people — the pod cannot have more spots than that`),
      ),
    );
    cy.gqlRaw(UPDATE, { id: podId, input: edit({ no_of_spots: half + 2 }) }, { token }).then((body) =>
      expectAnswer('hostUpdatePod', body, {
        id: podId,
        pod_description: marked('pod to cancel, edited'),
        no_of_spots: half + 2,
      }),
    );
  });

  it('HPD-06 a cancel needs a listed reason; a pod nobody else joined is cancelled and its slot freed', () => {
    cy.gqlRaw(CANCEL, { id: podId, subject: marked('not a reason') }, { token }).then((body) =>
      expectRefused('hostDeletePod', body, bad('Select a valid delete reason')),
    );
    cy.gqlRaw(CANCEL, { id: podId, subject: 'Other' }, { token }).then((body) =>
      expectRefused('hostDeletePod', body, bad('Please describe the reason')),
    );
    cy.gqlRaw(CANCEL, { id: podId, subject: 'Event cancelled' }, { token }).then((body) =>
      expectAnswer('hostDeletePod', body, true),
    );
    cy.gql<{ myHostPods: Array<{ id: string }> }>(HOST_PODS, {}, { token }).then(({ myHostPods }) => {
      expect(myHostPods.map((row) => row.id), 'the host’s live pods').to.not.include(podId);
    });
    cy.gql<{ venueSlots: Array<{ id: string; status: string; booked_by_pod_id: string | null }> }>(
      SLOTS,
      { venue: world.venue.id },
      { token },
    ).then(({ venueSlots }) => {
      expect(venueSlots, 'the freed slot').to.deep.include({ id: slotId, status: 'AVAILABLE', booked_by_pod_id: null });
    });
    cy.gqlRaw(DELETE_SLOT, { id: slotId }, { token }).then((body) => expectAnswer('deleteVenueSlot', body, true));
  });

  it('HPD-07 the host’s age is held to the configured window on the server', () => {
    const tooYoung = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const account = runAccount();
    const input = { full_name: marked('host'), email: account.email, phone: account.phone, dob: tooYoung };
    cy.gqlRaw(HOST_STEP1, { input }, { token }).then((body) =>
      expectRefused('submitHostStep1', body, bad('Host age must be between 18 and 100 years')),
    );
    cy.gqlRaw(HOST_STEP1, { input: { ...input, dob: 'not-a-date' } }, { token }).then((body) =>
      expectRefused('submitHostStep1', body, bad('Enter a valid date of birth')),
    );
  });
});
