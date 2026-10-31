/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';
import { asRole, expectCallsRefused, call, NO_ID } from '../../../support/api-staff';

/**
 * Server: Pod auto-cancel and Server: Pod cancellation risk alerts — what the
 * two sweeps decide on, read the way the admin pod page reads it.
 *
 * Both sweeps run on assessPodCancellationRisk (pod.cancellationRisk.ts) with
 * Pod Settings' auto-cancel switch, lead hours, risk window and alert interval
 * (settingsService.getPodAutoCancelSettings). `podCancellationRisk` is that
 * verdict computed live for one pod; the stored `Pod.cancellation_risk` flag
 * is admin-only so a member's feed never says "this pod is about to be
 * cancelled". Scenario map: Server › Pod auto-cancel ("Sweep disabled by
 * default", "Pods outside the window or healthy") and Server › Pod
 * cancellation risk alerts ("No risk while auto-cancel is off").
 *
 * Making a finance-negative pod and waiting for a 10-minute tick would cancel
 * and refund real bookings, so the suite only reads: the verdict for listed
 * pods must agree with the settings and the clock, gate by gate.
 */

interface PodSettings {
  pod_auto_cancel_enabled: boolean;
  pod_auto_cancel_lead_hours: number;
  pod_cancel_risk_window_hours: number;
  pod_cancel_risk_alert_hours: number;
}

interface Risk {
  pod_id: string;
  state: string;
  at_risk: boolean;
  hours_until_start: number;
  lead_hours: number;
  window_hours: number;
  alert_hours: number;
  cancel_at: string | null;
  shortfall: number;
  next_alert_at: string | null;
}

interface ListedPod {
  id: string;
  pod_date_time: string;
  cancellation_risk: unknown;
}

const HOUR_MS = 3_600_000;
const SETTINGS = call(
  'appSettings',
  `query E2ePodCancelSettings { appSettings {
    pod_auto_cancel_enabled pod_auto_cancel_lead_hours pod_cancel_risk_window_hours pod_cancel_risk_alert_hours
  } }`,
);
const RISK = `query E2ePodCancellationRisk($id: ID!) { podCancellationRisk(pod_doc_id: $id) {
  pod_id state at_risk hours_until_start lead_hours window_hours alert_hours cancel_at shortfall next_alert_at
} }`;
const LISTED = `query E2eListedPodsRisk { pods(filter: { is_active: true }) { id pod_date_time cancellation_risk { at_risk } } }`;
const UPDATE_SETTINGS = call(
  'updateAppSettings',
  `mutation E2eUpdatePodCancelSettings { updateAppSettings(input: {}) { pod_auto_cancel_enabled } }`,
);

/** One pod's verdict must follow from the settings and its start time. */
function expectVerdict(risk: Risk, settings: PodSettings, startsAt: number): void {
  expect(risk.lead_hours, 'lead hours from Pod Settings').to.equal(settings.pod_auto_cancel_lead_hours);
  expect(risk.window_hours, 'risk window from Pod Settings').to.equal(settings.pod_cancel_risk_window_hours);
  expect(risk.alert_hours, 'alert interval from Pod Settings').to.equal(settings.pod_cancel_risk_alert_hours);
  expect(risk.hours_until_start, 'hours until start').to.be.closeTo((startsAt - Date.now()) / HOUR_MS, 0.25);
  expect(risk.at_risk, 'at_risk is exactly the AT_RISK state').to.equal(risk.state === 'AT_RISK');

  if (!settings.pod_auto_cancel_enabled) {
    expect(risk.state, 'nothing is watched while auto-cancel is off').to.equal('AUTO_CANCEL_OFF');
  } else if (startsAt <= Date.now()) {
    expect(risk.state, 'a started pod is past the sweep').to.equal('NOT_UPCOMING');
  } else if (risk.hours_until_start > settings.pod_cancel_risk_window_hours + 0.25) {
    expect(risk.state, 'later than the risk window looks ahead').to.be.oneOf(['OUTSIDE_WINDOW', 'NO_VENUE_COST']);
  }

  if (risk.at_risk) {
    expect(risk.shortfall, 'an at-risk pod is short of its venue cost').to.be.greaterThan(0);
    expect(Date.parse(String(risk.cancel_at)), 'cancelled at the start minus the lead window').to.equal(
      startsAt - settings.pod_auto_cancel_lead_hours * HOUR_MS,
    );
  } else {
    expect(risk.cancel_at, 'no cancellation date unless at risk').to.equal(null);
    expect(risk.shortfall).to.equal(0);
    expect(risk.next_alert_at, 'no alert round unless at risk').to.equal(null);
  }
}

describe('API · The auto-cancel and risk verdicts follow Pod Settings', { testIsolation: false }, () => {
  let memberToken = '';
  let pods: ListedPod[] = [];

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      cy.gql<{ pods: ListedPod[] }>(LISTED, {}, { token }).then((data) => {
        pods = data.pods;
      });
    });
  });

  after(() => {
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('PCR-01 a member\'s pod list never carries the risk flag, and the live verdict and settings are staff-only', () => {
    expect(pods.length, 'the server lists active pods to check against').to.be.greaterThan(0);
    pods.forEach((p) => expect(p.cancellation_risk, `pod ${p.id} cancellation_risk for a member`).to.equal(null));
    cy.gqlRaw(RISK, { id: pods[0].id }, { token: null }).then((body) =>
      expectRefused('podCancellationRisk', body, SIGNED_OUT),
    );
    cy.gqlRaw(RISK, { id: pods[0].id }, { token: memberToken }).then((body) =>
      expectRefused('podCancellationRisk', body, ACCESS_DENIED),
    );
    expectCallsRefused(memberToken, [SETTINGS]);
  });

  it('PCR-02 each listed pod\'s verdict agrees with the switch, the windows and its start time', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gql<{ appSettings: PodSettings }>(SETTINGS.query, {}, { token }).then(({ appSettings }) => {
        expect(appSettings.pod_auto_cancel_lead_hours, 'lead hours').to.be.a('number').and.at.least(0);
        expect(appSettings.pod_cancel_risk_window_hours, 'risk window').to.be.a('number').and.at.least(0);
        expect(appSettings.pod_cancel_risk_alert_hours, 'alert interval').to.be.at.least(1);
        // A handful is enough to cover each gate the live pods sit behind; every call is a read.
        pods.slice(0, 6).forEach((pod) => {
          cy.gql<{ podCancellationRisk: Risk }>(RISK, { id: pod.id }, { token }).then(({ podCancellationRisk }) => {
            expect(podCancellationRisk.pod_id).to.equal(pod.id);
            expectVerdict(podCancellationRisk, appSettings, Date.parse(pod.pod_date_time));
          });
        });
      });
    });
  });

  it('PCR-03 a malformed or unknown pod is refused, and City Admins cannot change Pod Settings', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gqlRaw(RISK, { id: 'not-a-pod' }, { token }).then((body) =>
        expectRefused('podCancellationRisk', body, refusal('BAD_USER_INPUT', 'Invalid pod')),
      );
      cy.gqlRaw(RISK, { id: NO_ID }, { token }).then((body) =>
        expectRefused('podCancellationRisk', body, refusal('NOT_FOUND', 'Pod not found')),
      );
      // ADMIN_WRITE in settings.resolver.ts is SUPER_ADMIN and TECH_MANAGER; the input changes nothing either way.
      expectCallsRefused(token, [UPDATE_SETTINGS]);
    });
  });
});
