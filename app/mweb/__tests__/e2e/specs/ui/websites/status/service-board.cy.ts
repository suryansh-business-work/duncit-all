/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  expectNewTab,
  formatUptime,
  siteBranding,
  STATE_LABEL,
  statusCopy,
  statusServices,
  statusSummary,
  visitSite,
  type StatusGroup,
  type StatusSummary,
} from '../../../../support/ui-websites';

/**
 * The status board (website/status-website/src/App.tsx + hooks/useStatusData.ts):
 * the service catalogue from /status/services, the live roll-up from
 * /status/summary, the refresh indicator, the per-service rows (ServiceRow.tsx)
 * and the client-side filters (StatusFilters.tsx, useFilteredGroups.ts). Every
 * expected row, chip and banner line is computed from the same REST answers.
 */

const ISSUE = (state: string): boolean => state !== 'operational' && state !== 'nodata';

describe('UI Status website · Service board', () => {
  let t: Translator['t'];
  let appName: string;
  let environment: 'production' | 'staging';
  let groups: StatusGroup[];
  let summary: StatusSummary;

  before(() => {
    statusCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((branding) => {
      appName = branding.app_name;
    });
    statusServices().then((body) => {
      groups = body.groups;
      environment = body.environment;
    });
    statusSummary().then((body) => {
      summary = body;
    });
  });

  const rowButton = (name: string) => cy.get(`[aria-label="Show status and details for ${name}"]`);

  /** OverallStatusBanner.tsx deriveOverallStatus, in words. */
  const bannerMessage = (): string => {
    const { operational, total, down, degraded } = summary.overall;
    if (total === 0) return t('status.board.awaiting');
    if (operational === total) return t('status.board.allOperational');
    const key = down > 0 && degraded === 0 ? 'status.board.outage' : 'status.board.reportingIssues';
    return t(key, { vars: { issues: down + degraded, total } });
  };

  it('BOARD-01 a skeleton shows first, then the titled board, its banner, chart, filters and every group', () => {
    cy.intercept('GET', '**/status/services', (req) => {
      req.on('response', (res) => {
        res.setDelay(1500);
      });
    }).as('services');
    visitSite('status');
    cy.get('[role="status"][aria-busy="true"]').should('have.attr', 'aria-label', t('status.loading.board'));
    cy.wait('@services');
    cy.get('[role="status"][aria-busy="true"]').should('not.exist');
    cy.get('header h1').should('readText', t('status.board.title', { vars: { app: appName } }));
    cy.title().should('eq', `${appName} Status`);
    cy.contains(t('status.board.overallUptimeHeading')).should('exist');
    cy.get(`input[aria-label="${t('status.board.searchAria')}"]`).should('exist');
    for (const group of groups) cy.contains('section > span', group.title).should('exist');
  });

  it('BOARD-02 the banner reads the live roll-up, with the time it was last checked', () => {
    visitSite('status');
    cy.contains(bannerMessage()).should('exist');
    cy.contains(t('status.board.lastChecked', { vars: { time: '' } }).trim()).should('exist');
  });

  it('BOARD-03 a staging board says so beside its title', () => {
    visitSite('status');
    if (environment === 'staging') cy.get('header').should('contain.text', t('status.board.staging'));
    else cy.get('header').should('not.contain.text', t('status.board.staging'));
  });

  it('BOARD-04 a thin refresh bar shows while a summary request is in flight', () => {
    cy.intercept('GET', '**/status/summary', (req) => {
      req.on('response', (res) => {
        res.setDelay(2000);
      });
    }).as('summary');
    visitSite('status');
    cy.get(`[role="progressbar"][aria-label="${t('status.loading.refreshing')}"]`).should('exist');
    cy.wait('@summary');
    cy.get(`[role="progressbar"][aria-label="${t('status.loading.refreshing')}"]`).should('not.exist');
  });

  it('BOARD-05 every service row shows its 24h and 90d uptime, its state, and any active incidents', () => {
    visitSite('status');
    for (const service of groups.flatMap((group) => group.items)) {
      const live = summary.services[service.key];
      const state = live?.state ?? 'nodata';
      rowButton(service.name).within(() => {
        cy.contains(service.description).should('exist');
        cy.contains(`24h · ${formatUptime(live?.uptime_24h)}`).should('exist');
        cy.contains(`90d · ${formatUptime(live?.uptime_90d)}`).should('exist');
        cy.contains(STATE_LABEL[state]).should('exist');
        if (live && live.active_incidents > 0) cy.contains(`${live.active_incidents} active`).should('exist');
      });
    }
  });

  it('BOARD-06 a row\'s open-in-new-tab link goes to the service URL without opening the details dialog', () => {
    const [service] = groups[0].items;
    visitSite('status');
    cy.get(`a[aria-label="Open ${service.name} in a new tab"]`).then(($a) => {
      expectNewTab($a, service.url);
      // Keep the run on this page: the link's default (a new tab) is cancelled;
      // whether the row's own click handler runs is still the page's decision.
      $a[0].addEventListener('click', (event) => event.preventDefault());
    });
    cy.get(`a[aria-label="Open ${service.name} in a new tab"]`).click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('BOARD-07 an unreachable catalogue says the service catalog could not be loaded', () => {
    cy.intercept('GET', '**/status/services', { forceNetworkError: true });
    visitSite('status');
    cy.get('[role="alert"]').should('contain.text', 'Could not load the service catalog.');
  });

  it('BOARD-08 an unreachable summary says the service status could not be refreshed', () => {
    cy.intercept('GET', '**/status/summary', { forceNetworkError: true });
    visitSite('status');
    cy.get('[role="alert"]').should('contain.text', 'Could not refresh service status.');
  });

  it('BOARD-09 search, group and status filters narrow the board, and All with an empty search restores it', () => {
    const all = groups.flatMap((group) => group.items);
    const [firstGroup] = groups;
    const term = all[0].name.split(' ')[0].toLowerCase();
    const searched = all.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(term));
    const issueCount = all.filter((s) => ISSUE(summary.services[s.key]?.state ?? 'operational')).length;
    visitSite('status');
    const search = `input[aria-label="${t('status.board.searchAria')}"]`;
    cy.get(search).type(term);
    cy.get('[aria-label^="Show status and details for "]').should('have.length', searched.length);
    cy.get(search).clear();

    cy.contains('label', t('status.board.group')).parent().find('[role="combobox"]').click();
    cy.contains('[role="option"]', firstGroup.title).click();
    cy.get('[aria-label^="Show status and details for "]').should('have.length', firstGroup.items.length);
    cy.contains('label', t('status.board.group')).parent().find('[role="combobox"]').click();
    cy.contains('[role="option"]', t('status.board.allGroups')).click();

    cy.contains('button', t('status.board.issues')).click();
    if (issueCount === 0) cy.contains('No services match your filters.').should('exist');
    else cy.get('[aria-label^="Show status and details for "]').should('have.length', issueCount);
    cy.contains('button', t('status.board.operational')).click();
    cy.get('[aria-label^="Show status and details for "]').should('have.length', all.length - issueCount);
    cy.contains('button', t('status.board.allStatuses')).click();
    cy.get('[aria-label^="Show status and details for "]').should('have.length', all.length);
  });
});
