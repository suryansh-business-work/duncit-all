import type { RunAccount } from '../../support/run-account';
import {
  PORTAL_FEATURES_API,
  apiToken,
  asAccount,
  closeChatPanelState,
  openSignedIn,
  readWorkspace,
  restoreWorkspace,
  runPasswordNow,
  type WorkspaceDto,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Shell taskbar: a running window — the docked staff chat panel
 * (`staff-chat` in useWorkspaceWindow) — gets a taskbar button; minimising it
 * hands the page its width back and is saved in the workspace's `minimised`
 * list, so a reload keeps it minimised; the button restores it. Choosing
 * "Follow the workspace" in the clock tray saves an empty zone. No message is
 * sent to anyone; the panel is only opened, minimised and closed.
 */

describe('Portal Shell · Shell taskbar (Support, run account)', () => {
  let account: RunAccount;
  let saved: WorkspaceDto | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) => {
      asAccount<{ portalMode: { chat_enabled: boolean } | null }>('support', token, PORTAL_FEATURES_API, { key: 'support' }).then(
        (data) => {
          if (data.portalMode?.chat_enabled === false) {
            throw new Error('Staff chat is turned off for Support (Admin > Portal App Settings); the taskbar window needs it.');
          }
        },
      );
      readWorkspace('support', token).then((state) => {
        saved = state;
        restoreWorkspace('support', token, { ...state, minimised: [] });
      });
    });
  });

  after(() => {
    if (!account || !saved) return;
    const state = saved;
    apiToken('support', account).then((token) => restoreWorkspace('support', token, state));
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account)).then((token) => closeChatPanelState('support', token));
  });

  it('ST-01 the open chat panel is a taskbar window that minimises, stays minimised over a reload, and restores', () => {
    openSignedIn('support', '/');
    cy.byTestId('shell-header-chat').click();
    cy.byTestId('staff-chat-panel').should('be.visible');
    cy.byTestId('shell-taskbar-window-staff-chat').should('have.attr', 'aria-pressed', 'true');

    cy.interceptOperation('SaveShellWorkspaceState');
    cy.byTestId('staff-chat-minimise').click();
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input.minimised').should('deep.equal', ['staff-chat']);
    cy.byTestId('staff-chat-panel').should('not.exist');
    cy.byTestId('shell-taskbar-window-staff-chat').should('have.attr', 'aria-pressed', 'false');

    cy.reload();
    cy.byTestId('shell-taskbar-window-staff-chat').should('have.attr', 'aria-pressed', 'false');
    cy.byTestId('staff-chat-panel').should('not.exist');

    cy.interceptOperation('SaveShellWorkspaceState', 'Restored');
    cy.byTestId('shell-taskbar-window-staff-chat').click();
    cy.wait('@Restored').its('request.body.variables.input.minimised').should('deep.equal', []);
    cy.byTestId('staff-chat-panel').should('be.visible');

    cy.byTestId('staff-chat-close').click();
    cy.byTestId('staff-chat-panel').should('not.exist');
    cy.byTestId('shell-taskbar-window-staff-chat').should('not.exist');
  });

  it('ST-02 "Follow the workspace" in the clock tray saves an empty zone', () => {
    // From a picked zone, so choosing the workspace is a change (Autocomplete ignores re-picking its value).
    apiToken('support', account).then((token) =>
      readWorkspace('support', token).then((state) => restoreWorkspace('support', token, { ...state, clock_zone: 'Asia/Tokyo' })),
    );
    openSignedIn('support', '/');
    cy.byTestId('shell-taskbar-clock').click();
    cy.interceptOperation('SaveShellWorkspaceState');
    cy.byTestId('shell-clock-zone').find('input').clear().type('Follow the workspace{downArrow}{enter}');
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input').should('deep.equal', { clock_zone: '' });
    cy.byTestId('shell-clock-zone').find('input').invoke('val').should('match', /^Follow the workspace \(.+\)$/);
  });
});
