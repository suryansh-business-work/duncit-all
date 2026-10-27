import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemePicker } from '../../../../pages/event-form/luma/ThemePicker';
import { renderInEventForm } from '../helpers';

describe('ThemePicker', () => {
  it('lists the five themes and nine colours, with the saved ones pressed', () => {
    renderInEventForm(<ThemePicker />, { defaults: { theme_key: 'PATTERN', theme_accent: 'BLUE' } });
    for (const name of ['Minimal', 'Gradient', 'Ambient', 'Pattern', 'Confetti']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', name === 'Pattern' ? 'true' : 'false');
    }
    expect(screen.getByRole('group', { name: 'Theme colour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Duncit red' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('labels the theme group with its heading', () => {
    renderInEventForm(<ThemePicker />);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
  });

  it('picks a theme and a colour into the form', async () => {
    const { user, form } = renderInEventForm(<ThemePicker />);
    await user.click(screen.getByRole('button', { name: 'Gradient' }));
    await user.click(screen.getByRole('button', { name: 'Teal' }));
    expect(form().getValues('theme_key')).toBe('GRADIENT');
    expect(form().getValues('theme_accent')).toBe('TEAL');
    expect(screen.getByRole('button', { name: 'Gradient' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Minimal' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the current choice when it is pressed again (a theme is never unset)', async () => {
    const { user, form } = renderInEventForm(<ThemePicker />);
    await user.click(screen.getByRole('button', { name: 'Minimal' }));
    await user.click(screen.getByRole('button', { name: 'Duncit red' }));
    expect(form().getValues('theme_key')).toBe('MINIMAL');
    expect(form().getValues('theme_accent')).toBe('DEFAULT');
    expect(screen.getByRole('button', { name: 'Minimal' })).toHaveAttribute('aria-pressed', 'true');
  });
});
