/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { statusCopy, statusServices, visitSite, type StatusService } from '../../../../support/ui-websites';

/**
 * The service details dialog (website/status-website/src/components/
 * service-details-dialog): the live /status/probe answer, the server's /health
 * report for a service that has one, and the 24-hour / 90-day history from
 * /status/history. What each section must say is read from the request the
 * dialog itself made.
 */

interface ProbeAnswer {
  ok: boolean;
  statusCode: number | null;
  statusText: string | null;
  error?: string;
}

interface HistoryAnswer {
  daily: unknown[];
  points: { latency_ms: number | null }[];
}

describe('UI Status website · Service details', () => {
  let t: Translator['t'];
  let services: StatusService[];

  before(() => {
    statusCopy().then((copy) => {
      t = copy;
    });
    statusServices().then((body) => {
      services = body.groups.flatMap((group) => group.items);
    });
  });

  const withHealth = (): StatusService => {
    const service = services.find((s) => s.health && /api|server/i.test(`${s.key} ${s.name}`)) ?? services.find((s) => s.health);
    if (!service) throw new Error('Staging prerequisite: no status service carries a health URL (the API server should).');
    return service;
  };

  const open = (service: StatusService) => {
    cy.get(`[aria-label="Show status and details for ${service.name}"]`).click();
    cy.get('[role="dialog"]').should('be.visible');
  };

  it('DET-01 the API server dialog shows its name, the live endpoint answer, server health and history', () => {
    const service = withHealth();
    cy.intercept('GET', '**/status/probe*').as('probe');
    cy.intercept('GET', '**/status/history*').as('history');
    cy.intercept('GET', service.health ?? '').as('health');
    visitSite('status');
    open(service);
    cy.get('[role="dialog"] h2').should('readText', service.name);
    cy.get('[role="dialog"]').should('contain.text', t('status.detail.endpoint'));
    cy.wait('@probe').then(({ response }) => {
      const probe = response?.body as ProbeAnswer;
      const label = probe.statusCode === null ? (probe.error ?? t('status.detail.unreachable')) : `${probe.statusCode} ${probe.statusText ?? ''}`.trim();
      cy.contains('[role="dialog"]', t('status.detail.httpStatus')).should('exist');
      cy.get('[role="dialog"]').should('contain.text', label);
    });
    cy.get('[role="dialog"]').should('contain.text', t('status.detail.serverHealth'));
    cy.wait('@health');
    // A health report the browser could read lists every field; one it could not
    // (an error status, or the health host refusing this origin) says so instead.
    cy.get('[role="dialog"]').should(($dialog) => {
      const text = $dialog.text();
      const fields = ['status', 'database', 'version', 'environment', 'node', 'platform', 'hostname'].map((key) => t(`status.detail.${key}`));
      const listed = fields.every((label) => text.includes(label));
      expect(listed || text.includes(t('status.detail.healthUnavailable')), 'health listed or reported unavailable').to.eq(true);
    });
    cy.wait('@history').then(({ response }) => {
      const history = response?.body as HistoryAnswer;
      const hasData = history.daily.length > 0 || history.points.some((p) => p.latency_ms !== null);
      if (hasData) cy.get('[role="dialog"]').should('contain.text', t('status.detail.history'));
      else cy.get('[role="dialog"]').should('contain.text', t('status.detail.noHistory'));
    });
  });

  it('DET-02 the close button shuts the dialog', () => {
    visitSite('status');
    open(services[0]);
    cy.get(`[role="dialog"] button[aria-label="${t('status.detail.close')}"]`).click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('DET-03 a service without a health URL has no Server health section', () => {
    const plain = services.find((s) => !s.health);
    if (!plain) throw new Error('Staging prerequisite: every status service has a health URL; none to check without one.');
    visitSite('status');
    open(plain);
    cy.get('[role="dialog"]').should('contain.text', t('status.detail.endpoint')).and('not.contain.text', t('status.detail.serverHealth'));
  });

  it('DET-04 a history request that fails says the history is unavailable', () => {
    cy.intercept('GET', '**/status/history*', { forceNetworkError: true });
    visitSite('status');
    open(services[0]);
    cy.get('[role="dialog"]').should('contain.text', t('status.detail.historyUnavailable'));
  });
});
