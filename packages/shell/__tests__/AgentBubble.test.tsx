/**
 * One turn of the Agent conversation: yours tinted and right, its report
 * plain and left, with whatever it created listed underneath.
 */
import { MockedProvider } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentBubble } from '../src/chrome/agent/AgentBubble';
import type { AgentMessage } from '../src/chrome/agent/useAgent';

describe('AgentBubble', () => {
  it('renders your own instruction on the right, with no results list', () => {
    const message: AgentMessage = { id: 'm-1', role: 'USER', content: 'Create 3 pods' };
    const { container } = render(<AgentBubble message={message} />);

    expect(container.textContent).toContain('Create 3 pods');
    expect(container.querySelector('ul, ol')).toBeNull();
  });

  it("renders the agent's report on the left, with what it created listed underneath", () => {
    const message: AgentMessage = {
      id: 'm-2',
      role: 'AGENT',
      content: 'Created 1 pod.',
      items: [{ kind: 'POD', ok: true, id: 'p-1', ref: 'DUN-POD-1', title: 'Badminton', detail: '', when: null }],
    };
    const { container } = render(
      <MockedProvider mocks={[]}>
        <AgentBubble message={message} />
      </MockedProvider>,
    );

    expect(container.textContent).toContain('Created 1 pod.');
    expect(container.textContent).toContain('Badminton');
  });
});
