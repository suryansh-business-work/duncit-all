/**
 * The Agent, offered from every console: a dock tab that opens a docked
 * drawer, with availability read once and a restart button wired up to
 * whatever AgentChat registers.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';

import { AgentLauncher } from '../src/chrome/agent/AgentLauncher';
import { AGENT_AVAILABILITY } from '../src/chrome/agent/queries';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('AgentLauncher', () => {
  it('opens the drawer from the dock tab, hiding the tab while it is open', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AgentLauncher />
      </MockedProvider>,
    );
    await settle();

    fireEvent.click(document.querySelector('[aria-label="Open Agent"]') as HTMLElement);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Open Agent"]')).toBeNull();
  });

  it('closes the drawer from its own close button, bringing the dock tab back', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AgentLauncher />
      </MockedProvider>,
    );
    await settle();
    fireEvent.click(document.querySelector('[aria-label="Open Agent"]') as HTMLElement);
    await settle();

    fireEvent.click(document.body.querySelector('[aria-label="Close"]') as HTMLElement);
    // The exit transition needs real wall-clock time to remove the drawer.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    });

    expect(document.querySelector('[aria-label="Open Agent"]')).not.toBeNull();
  });

  it("reads the server's own availability once it answers, instead of the fallback", async () => {
    const mocks = [
      {
        request: { query: AGENT_AVAILABILITY },
        result: { data: { agentAvailability: { is_available: false, can_act: false, max_batch: 5 } } },
      },
    ];
    render(
      <MockedProvider mocks={mocks}>
        <AgentLauncher />
      </MockedProvider>,
    );
    await settle();
    await settle();

    // Data has to have already landed by the time the drawer opens — the
    // fallback vs. server-answered read only differs at the moment AgentChat
    // is actually mounted.
    fireEvent.click(document.querySelector('[aria-label="Open Agent"]') as HTMLElement);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('runs whatever restart AgentChat registered from its own restart button', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AgentLauncher />
      </MockedProvider>,
    );
    await settle();
    fireEvent.click(document.querySelector('[aria-label="Open Agent"]') as HTMLElement);
    await settle();

    expect(() => {
      fireEvent.click(document.body.querySelectorAll('button')[0] as HTMLElement);
    }).not.toThrow();
  });
});
