import type { RunAccount } from '../../support/run-account';
import {
  apiToken,
  openSignedIn,
  readWorkspace,
  restoreWorkspace,
  runPasswordNow,
  type WorkspaceDto,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Taskbar and clock: the clock tray's time zone and "Count
 * seconds" are saved to the run account's workspace (`SaveShellWorkspaceState`
 * with `clock_zone` / `clock_seconds`) and read back by another console. The
 * workspace is restored in `after()`.
 */

const ZONE = 'Asia/Tokyo';

describe('Portal Shell · Taskbar and clock (Support and Legal, run account)', () => {
  let account: RunAccount;
  let saved: WorkspaceDto | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      readWorkspace('support', token).then((state) => {
        saved = state;
        restoreWorkspace('support', token, { ...state, clock_zone: '', clock_seconds: false });
      }),
    );
  });

  after(() => {
    if (!account || !saved) return;
    const state = saved;
    apiToken('support', account).then((token) => restoreWorkspace('support', token, state));
  });

  it('TC-01 Count seconds is saved and the clock then ticks every second', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.byTestId('shell-taskbar-clock').click();
    cy.byTestId('shell-clock-tray').should('be.visible');
    cy.interceptOperation('SaveShellWorkspaceState');
    cy.byTestId('shell-clock-seconds').find('input[type="checkbox"]').should('not.be.checked').click();
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input').should('deep.equal', { clock_seconds: true });
    cy.get('body').type('{esc}');
    cy.byTestId('shell-taskbar-clock')
      .invoke('text')
      .then((first) => {
        cy.wait(1500);
        cy.byTestId('shell-taskbar-clock').invoke('text').should('not.equal', first);
      });
  });

  it('TC-02 a time zone picked in the tray is saved', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.byTestId('shell-taskbar-clock').click();
    cy.interceptOperation('SaveShellWorkspaceState');
    cy.byTestId('shell-clock-zone').find('input').clear().type(`${ZONE}{downArrow}{enter}`);
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input').should('deep.equal', { clock_zone: ZONE });
    cy.byTestId('shell-clock-zone').find('input').invoke('val').should('contain', ZONE);
  });

  it('TC-03 Legal reads the same zone and seconds setting from the workspace', () => {
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    cy.interceptOperation('ShellWorkspaceState');
    openSignedIn('legal', '/');
    cy.wait('@ShellWorkspaceState').its('response.body.data.shellWorkspaceState').should((state) => {
      expect(state.clock_zone).to.equal(ZONE);
      expect(state.clock_seconds).to.equal(true);
    });
    cy.byTestId('shell-taskbar-clock').click();
    cy.byTestId('shell-clock-seconds').find('input[type="checkbox"]').should('be.checked');
    cy.byTestId('shell-clock-zone').find('input').invoke('val').should('contain', ZONE);
  });
});
