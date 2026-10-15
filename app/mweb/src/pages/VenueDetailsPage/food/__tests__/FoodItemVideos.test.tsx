import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FoodItemVideos from '../FoodItemVideos';

const item = (videos: string[] | undefined) => ({ id: 'chai', name: 'Masala Chai', videos });

describe('FoodItemVideos', () => {
  it('renders nothing for a dish with no playable video', () => {
    const { container, rerender } = render(<FoodItemVideos item={item(undefined)} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<FoodItemVideos item={item(['', '   '])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('loads nothing until the guest asks: a "Watch video" chip, no player', () => {
    render(<FoodItemVideos item={item(['https://cdn.test/chai.mp4'])} />);
    expect(screen.getByTestId('food-item-videos-chai')).toHaveTextContent('Watch video');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('video, iframe')).toBeNull();
  });

  it('plays every video in a dialog named after the dish, and closes from its button', async () => {
    render(
      <FoodItemVideos item={item(['https://youtu.be/dQw4w9WgXcQ', 'https://cdn.test/chai.mp4'])} />,
    );
    fireEvent.click(screen.getByTestId('food-item-videos-chai'));

    const dialog = await screen.findByRole('dialog', { name: /Masala Chai/ });
    expect(within(dialog).getByTitle('Video 1 of Masala Chai').tagName).toBe('IFRAME');
    expect(within(dialog).getByTestId('food-item-video-chai-1').tagName).toBe('VIDEO');
    expect(within(dialog).getByTestId('food-item-video-chai-1')).toHaveAccessibleName('Video 2 of Masala Chai');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
