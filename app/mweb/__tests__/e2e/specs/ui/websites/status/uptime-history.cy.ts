/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  formatStatusDate,
  STATE_LABEL,
  statusCopy,
  statusIncidents,
  statusServices,
  statusSummary,
  visitSite,
  type StatusIncident,
  type StatusService,
  type StatusSummary,
} from '../../../../support/ui-websites';

/**
 * Uptime history on the status board: each service row's 90-bar daily strip
 * (UptimeBarStrip.tsx, one titled bar per day) and the Past incidents list
 * (IncidentsSection.tsx) from /status/incidents. Expected bars and rows are the
 * REST answers the page itself renders.
 */

const IMPACT_LABEL: Record<StatusIncident['impact'], string> = {
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
};

describe('UI Status website · Uptime history', () => {
  let t: Translator['t'];
  let services: StatusService[];
  let summary: StatusSummary;

  before(() => {
    statusCopy().then((copy) => {
      t = copy;
    });
    statusServices().then((body) => {
      services = body.groups.flatMap((group) => group.items);
    });
    statusSummary().then((body) => {
      summary = body;
    });
  });

  it('HIST-01 a service strip has one bar per day, each titled "<date> · <uptime>% · <state>"', () => {
    const service = services.find((s) => (summary.services[s.key]?.daily.length ?? 0) > 0);
    if (!service) throw new Error('Staging prerequisite: no status service has daily history yet (checks run every 5 minutes).');
    const daily = summary.services[service.key].daily;
    visitSite('status');
    cy.get(`[aria-label="Show status and details for ${service.name}"] [role="img"]`).within(() => {
      cy.get('span[title]').should('have.length', daily.length);
      daily.forEach((day, index) => {
        cy.get('span[title]').eq(index).should('have.attr', 'title', `${day.date} · ${day.uptime.toFixed(2)}% · ${STATE_LABEL[day.state]}`);
      });
    });
    const operational = daily.filter((day) => day.state === 'operational').length;
    cy.get(`[aria-label="Show status and details for ${service.name}"] [role="img"]`).should(
      'have.attr',
      'aria-label',
      `Uptime over the last ${daily.length} days: ${operational} fully operational`,
    );
  });

  it('HIST-02 a day the server rated a major outage (probe uptime under 90%, statusAnalytics.ts probeState) is drawn as one', () => {
    const day = Object.values(summary.services)
      .flatMap((s) => s.daily)
      .find((d) => d.state === 'major_outage');
    if (!day) throw new Error('Staging prerequisite: no service has a major-outage day in the last 90 days to check.');
    visitSite('status');
    cy.get(`span[title="${day.date} · ${day.uptime.toFixed(2)}% · ${STATE_LABEL.major_outage}"]`).should('exist');
  });

  it('HIST-03 Past incidents lists every incident — impact, title, service, Resolved or Since — or says there were none', () => {
    statusIncidents().then((incidents) => {
      visitSite('status');
      cy.contains('section > span', t('status.board.pastIncidents')).parent().as('incidents');
      if (!incidents.length) {
        cy.get('@incidents').should('contain.text', t('status.board.noIncidents'));
        return;
      }
      for (const incident of incidents) {
        cy.get('@incidents').should('contain.text', incident.title).and('contain.text', incident.service_name).and('contain.text', IMPACT_LABEL[incident.impact]);
        const range = incident.resolved_at
          ? `${formatStatusDate(incident.started_at)} — ${formatStatusDate(incident.resolved_at)}`
          : `Since ${formatStatusDate(incident.started_at)}`;
        cy.get('@incidents').should('contain.text', range);
      }
      const resolved = incidents.filter((i) => i.resolved_at).length;
      cy.get('@incidents').find('.MuiChip-label').filter((_, el) => el.textContent === 'Resolved').should('have.length', resolved);
    });
  });
});
