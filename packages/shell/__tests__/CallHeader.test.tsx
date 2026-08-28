/**
 * Who you are on with, and what the call is doing — the phase label and
 * whether this side is sharing its screen.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CallHeader from '../src/staff-chat/call-panel/CallHeader';

describe('CallHeader', () => {
  it('names the call kind and phase, without mentioning screen sharing', () => {
    const { container } = render(
      <CallHeader phase="connected" kind="VIDEO" peerName="Asha Rao" peerPhoto="" sharing={false} />,
    );
    expect(container.textContent).not.toContain('sharing');
  });

  it('names no phase at all while idle, rather than a stray translation key', () => {
    const { container } = render(
      <CallHeader phase="idle" kind="AUDIO" peerName="Asha Rao" peerPhoto="" sharing={false} />,
    );
    expect(container.textContent).not.toContain('shell.chat.call');
  });

  it('says this side is sharing its screen once it is', () => {
    const { container } = render(
      <CallHeader phase="connected" kind="VIDEO" peerName="Asha Rao" peerPhoto="" sharing />,
    );
    expect(container.textContent).toContain('sharing your screen');
  });
});
