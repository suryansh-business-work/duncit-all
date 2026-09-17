import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CreatePodClub } from '../../create-pod.types';
import ClubOption from '../ClubOption';

const whoEvenAreWe: CreatePodClub = {
  id: 'club-wea',
  club_name: 'Who Even Are We?',
  location_id: 'loc-lucknow',
  locality: 'Gomti Nagar',
};

const renderOption = (place: string) =>
  render(
    <ul>
      <ClubOption club={whoEvenAreWe} place={place} role="option" aria-selected={false} />
    </ul>,
  );

describe('ClubOption', () => {
  it('reads as "Name | (pin) place" and is named that way aloud', () => {
    renderOption('Gomti Nagar, Lucknow');

    const option = screen.getByTestId('create-pod-club-option-club-wea');
    expect(option.tagName).toBe('LI');
    expect(option).toHaveAttribute('role', 'option');
    expect(option).toHaveAccessibleName('Who Even Are We?, Gomti Nagar, Lucknow');
    expect(option).toHaveTextContent('Who Even Are We?|Gomti Nagar, Lucknow');
    expect(screen.getByTestId('create-pod-club-option-club-wea-place')).toHaveTextContent(
      'Gomti Nagar, Lucknow',
    );
  });

  it('shows the name alone when the club names no place', () => {
    renderOption('');

    const option = screen.getByTestId('create-pod-club-option-club-wea');
    expect(option).not.toHaveAttribute('aria-label');
    expect(option).toHaveTextContent(/^Who Even Are We\?$/);
    expect(screen.queryByTestId('create-pod-club-option-club-wea-place')).not.toBeInTheDocument();
  });
});
