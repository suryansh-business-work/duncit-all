import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ContactsAllowCard from '../ContactsAllowCard';
import { fallbackT } from '../../../i18n/fallback';

const baseProps = {
  status: null,
  supported: true,
  busy: false,
  stage: null,
  failure: null,
  onAllow: vi.fn(),
};

const card = (over: Partial<Parameters<typeof ContactsAllowCard>[0]> = {}) =>
  render(<ContactsAllowCard {...baseProps} {...over} />);

describe('ContactsAllowCard', () => {
  it('invites a first sync when none has run, and starts it on press', () => {
    const onAllow = vi.fn();
    card({ onAllow });
    expect(screen.getByTestId('contacts-sync-summary')).toHaveTextContent(fallbackT('mweb.contacts.notSyncedYet'));
    expect(screen.getByTestId('contacts-allow-button')).toHaveTextContent(fallbackT('mweb.contacts.allowButton'));
    expect(screen.queryByTestId('contacts-invite-summary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contacts-allow-button'));
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it('summarises the last sync and offers a re-sync, with the invite count when there is one', () => {
    card({ status: { matched: 4, invitable: 7, synced_at: '2026-06-26T05:00:00.000Z' } as never });
    expect(screen.getByTestId('contacts-sync-summary')).toHaveTextContent(fallbackT('mweb.contacts.matched', { count: 4 }));
    expect(screen.getByTestId('contacts-allow-button')).toHaveTextContent(fallbackT('mweb.contacts.resync'));
    expect(screen.getByTestId('contacts-invite-summary')).toHaveTextContent(fallbackT('mweb.contacts.toInvite', { count: 7 }));
  });

  it('hides the invite line when nobody is left to invite', () => {
    card({ status: { matched: 4, invitable: 0, synced_at: '2026-06-26T05:00:00.000Z' } as never });
    expect(screen.queryByTestId('contacts-invite-summary')).not.toBeInTheDocument();
  });

  it('shows how far a sync in flight has got', () => {
    card({ stage: { phase: 'SENDING', done: 250, total: 1000 } as never, busy: true });
    expect(screen.getByTestId('contacts-sync-progress')).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.contacts.syncProgress', { vars: { sent: 250, total: 1000 } }))).toBeInTheDocument();
  });

  it('tells a browser without a contact picker to use the app, with no button', () => {
    card({ supported: false });
    expect(screen.queryByTestId('contacts-allow-button')).not.toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.contacts.pickerUnavailable'))).toBeInTheDocument();
  });

  it('names a denied permission and a failed sync differently', () => {
    const { rerender } = card({ failure: 'DENIED' });
    expect(screen.getByTestId('contacts-sync-error')).toHaveTextContent(fallbackT('mweb.contacts.permissionDenied'));
    rerender(<ContactsAllowCard {...baseProps} failure="FAILED" />);
    expect(screen.getByTestId('contacts-sync-error')).toHaveTextContent(fallbackT('mweb.contacts.syncFailed'));
  });
});
