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

  it('names the open slots for a physical pod, aloud too', () => {
    render(
      <ul>
        <ClubOption club={{ ...whoEvenAreWe, available_slots_count: 3 }} place="" showSlots role="option" aria-selected={false} />
      </ul>,
    );
    expect(screen.getByTestId('create-pod-club-option-club-wea-slots')).toHaveTextContent('3 open slots');
    expect(screen.getByTestId('create-pod-club-option-club-wea')).toHaveAccessibleName('Who Even Are We?, 3 open slots');
  });

  it('warns when the club has no open slot', () => {
    render(
      <ul>
        <ClubOption club={whoEvenAreWe} place="Gomti Nagar, Lucknow" showSlots role="option" aria-selected={false} />
      </ul>,
    );
    expect(screen.getByTestId('create-pod-club-option-club-wea-slots')).toHaveTextContent('No open slots');
  });
});
