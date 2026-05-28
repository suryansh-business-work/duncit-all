import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AppIcon from '../../src/components/AppIcon';

describe('AppIcon', () => {
  it('resolves a known icon name to its MUI glyph', () => {
    const { getByTestId } = render(<AppIcon name="sos" />);
    expect(getByTestId('WarningAmberIcon')).toBeInTheDocument();
  });

  it('maps each configured nav icon', () => {
    const map: Record<string, string> = {
      settings: 'SettingsIcon',
      tune: 'TuneIcon',
      dashboard: 'DashboardIcon',
      forum: 'ForumIcon',
      sos: 'WarningAmberIcon',
      callback: 'PhoneCallbackIcon',
      feedback: 'StarRateIcon',
      ticket: 'ConfirmationNumberIcon',
      chat: 'ForumIcon',
    };
    for (const [name, testId] of Object.entries(map)) {
      const { getByTestId, unmount } = render(<AppIcon name={name} />);
      expect(getByTestId(testId)).toBeInTheDocument();
      unmount();
    }
  });

  it('falls back to a neutral glyph for an unknown name', () => {
    const { getByTestId } = render(<AppIcon name="does-not-exist" />);
    expect(getByTestId('WidgetsIcon')).toBeInTheDocument();
  });
});
