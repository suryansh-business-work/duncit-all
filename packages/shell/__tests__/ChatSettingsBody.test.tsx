/**
 * How this chat looks: density, bubble colour, text size, time zone and
 * enter-to-send — every control reports its new value straight through
 * `onChange`, and nothing here owns state of its own.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ChatSettingsBody from '../src/staff-chat/ChatSettingsBody';
import type { ChatSettings } from '../src/staff-chat/useChatSettings';

const SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};

describe('ChatSettingsBody', () => {
  it('reports a density change from the toggle group', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<ChatSettingsBody settings={SETTINGS} onChange={onChange} />);

    fireEvent.click(getByLabelText('Compact'));

    expect(onChange).toHaveBeenCalledWith('density', 'COMPACT');
  });

  it('reports the chosen bubble colour, marking the current one as pressed', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<ChatSettingsBody settings={SETTINGS} onChange={onChange} />);

    expect(getByLabelText('Blue bubbles')).toHaveAttribute('aria-pressed', 'true');
    expect(getByLabelText('Purple bubbles')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(getByLabelText('Purple bubbles'));

    expect(onChange).toHaveBeenCalledWith('bubbleColor', 'secondary');
  });

  it('reports a text size change from the slider', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<ChatSettingsBody settings={SETTINGS} onChange={onChange} />);

    fireEvent.change(getByLabelText('Message text size'), { target: { value: 18 } });

    expect(onChange).toHaveBeenCalledWith('fontSize', 18);
  });

  it('reports a time zone change from the select', () => {
    const onChange = vi.fn();
    const { getByRole, getAllByRole } = render(<ChatSettingsBody settings={SETTINGS} onChange={onChange} />);

    fireEvent.mouseDown(getByRole('combobox', { name: 'Times shown in' }));
    fireEvent.click(getAllByRole('option').find((option) => option.textContent === 'UTC') as HTMLElement);

    expect(onChange).toHaveBeenCalledWith('timeZone', 'UTC');
  });

  it('reports enter-to-send toggling off, and shows the matching hint', () => {
    const onChange = vi.fn();
    const { getByLabelText, container } = render(<ChatSettingsBody settings={SETTINGS} onChange={onChange} />);

    expect(container.textContent).toContain('Shift+Enter starts a new line.');

    fireEvent.click(getByLabelText('Enter sends'));

    expect(onChange).toHaveBeenCalledWith('enterToSend', false);
  });

  it('shows the Ctrl/Cmd+Enter hint once enter-to-send is off', () => {
    const { container } = render(
      <ChatSettingsBody settings={{ ...SETTINGS, enterToSend: false }} onChange={vi.fn()} />,
    );

    expect(container.textContent).toContain('Ctrl+Enter sends; Enter starts a new line.');
    expect(container.textContent).not.toContain('Shift+Enter starts a new line.');
  });
});
