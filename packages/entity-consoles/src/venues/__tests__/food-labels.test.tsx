import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/shell';
import { foodDietLabel, foodSpiceLabel } from '../food-labels';

const translate = () => renderHook(() => useTranslation()).result.current.t;

describe('food labels', () => {
  it.each([
    ['VEG', 'Vegetarian'],
    ['NON_VEG', 'Non-vegetarian'],
    ['EGG', 'Contains egg'],
    ['VEGAN', 'Vegan'],
  ])('names the %s food type', (diet, label) => {
    expect(foodDietLabel(translate(), diet)).toBe(label);
  });

  it.each([
    ['NONE', 'Not spicy'],
    ['MILD', 'Mild'],
    ['MEDIUM', 'Medium'],
    ['HOT', 'Hot'],
    ['EXTRA_HOT', 'Extra hot'],
  ])('names the %s spice level', (level, label) => {
    expect(foodSpiceLabel(translate(), level)).toBe(label);
  });

  it('reads a value the server added before this client learnt it as itself', () => {
    expect(foodDietLabel(translate(), 'JAIN')).toBe('JAIN');
    expect(foodSpiceLabel(translate(), 'SMOKY')).toBe('SMOKY');
  });
});
