import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

interface RowProps {
  index: number;
  onMove: (dir: -1 | 1) => void;
}

// Replace MediaRow with one whose move controls are never disabled, so the
// out-of-range guard inside MediaField.move (which the real disabled buttons
// make unreachable) can be exercised.
vi.mock('../src/components/MediaRow', () => ({
  default: ({ index, onMove }: Readonly<RowProps>) => (
    <div>
      <button type="button" onClick={() => onMove(-1)}>{`up-${index}`}</button>
      <button type="button" onClick={() => onMove(1)}>{`down-${index}`}</button>
    </div>
  ),
}));

import MediaField from '../src/components/MediaField';

describe('MediaField move boundary guard', () => {
  it('no-ops when moving before the first or past the last item', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MediaField label="M" value={'https://x/a.jpg\nhttps://x/b.jpg'} onChange={onChange} onPickImage={vi.fn()} />);

    // Move the first item up (j = -1) and the last item down (j = length): both
    // hit the guard and return without calling onChange.
    await user.click(screen.getByText('up-0'));
    await user.click(screen.getByText('down-1'));
    expect(onChange).not.toHaveBeenCalled();

    // A valid in-range move still swaps and fires onChange.
    await user.click(screen.getByText('down-0'));
    expect(onChange).toHaveBeenCalledWith('https://x/b.jpg\nhttps://x/a.jpg');
  });
});
