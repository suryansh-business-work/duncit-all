import { renderToString } from 'react-dom/server';
import { MockedProvider } from '@apollo/client/testing/react';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../../shared/env';
import { LiteSessionProvider } from '../../../../shared/session';
import { MODE_STORAGE_KEY } from '../../../../shared/theme';
import { ModeToggle } from '../../../layout/header/ModeToggle';
import { renderWithProviders } from '../../test-utils';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('ModeToggle', () => {
  it('names the current mode and the one a tap switches to', () => {
    renderWithProviders(<ModeToggle />);
    expect(screen.getByRole('button', { name: 'Display: Dark. Switch to System' })).toBeInTheDocument();
  });

  it('steps through System, Light and Dark, remembering the choice on this device', async () => {
    const { user } = renderWithProviders(<ModeToggle />);

    await user.click(screen.getByRole('button', { name: 'Display: Dark. Switch to System' }));
    expect(screen.getByRole('button', { name: 'Display: System. Switch to Light' })).toBeInTheDocument();
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('system');

    await user.click(screen.getByRole('button', { name: 'Display: System. Switch to Light' }));
    expect(screen.getByRole('button', { name: 'Display: Light. Switch to Dark' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Display: Light. Switch to Dark' }));
    expect(screen.getByRole('button', { name: 'Display: Dark. Switch to System' })).toBeInTheDocument();
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('dark');
  });

  it('draws nothing in the server render, which cannot know the reader’s choice', () => {
    const html = renderToString(
      <MockedProvider>
        <LiteSessionProvider tokenKey={STORAGE_KEYS.token} initialToken={null}>
          <ModeToggle />
        </LiteSessionProvider>
      </MockedProvider>,
    );
    expect(html).toBe('');
  });
});
