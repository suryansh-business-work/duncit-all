import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DescriptionBlock } from '../../../pages/event/DescriptionBlock';
import { renderWithProviders } from '../../test-utils';

describe('DescriptionBlock', () => {
  it('shows the host’s words as the paragraphs they typed, under "About this event"', () => {
    renderWithProviders(<DescriptionBlock text={'Bring a blanket.\n\n  Snacks are on us.  \n\n\nRain or shine.'} />);

    expect(screen.getByRole('heading', { level: 2, name: 'About this event' })).toBeInTheDocument();
    const block = screen.getByTestId('event-description');
    const paragraphs = Array.from(block.querySelectorAll('p')).map((node) => node.textContent);
    expect(paragraphs).toEqual(['Bring a blanket.', 'Snacks are on us.', 'Rain or shine.']);
  });

  it('keeps a single line break inside one paragraph', () => {
    renderWithProviders(<DescriptionBlock text={'Line one\nline two'} />);
    const block = screen.getByTestId('event-description');
    expect(block.querySelectorAll('p')).toHaveLength(1);
    expect(block.querySelector('p')?.textContent).toBe('Line one\nline two');
  });

  it.each(['', '   ', '\n\n \n'])('renders nothing for a description of only whitespace (%j)', (text) => {
    renderWithProviders(<DescriptionBlock text={text} />);
    expect(screen.queryByTestId('event-description')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'About this event' })).not.toBeInTheDocument();
  });
});
