import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import useMediaPickerBridge from '../../src/editor/useMediaPickerBridge';

type Bridge = ReturnType<typeof useMediaPickerBridge>;

function Probe({ onBridge }: Readonly<{ onBridge: (b: Bridge) => void }>) {
  const bridge = useMediaPickerBridge();
  onBridge(bridge);
  return (
    <div>
      <span data-testid="open">{String(bridge.pickerOpen)}</span>
      <span data-testid="kind">{bridge.pickerKind}</span>
      <span data-testid="accept">{bridge.accept}</span>
      <span data-testid="title">{bridge.title}</span>
    </div>
  );
}

describe('useMediaPickerBridge', () => {
  it('resolves an image pick and exposes image dialog props', async () => {
    let bridge!: Bridge;
    render(<Probe onBridge={(b) => { bridge = b; }} />);
    expect(screen.getByTestId('open')).toHaveTextContent('false');

    let picked: Promise<string | null>;
    act(() => {
      picked = bridge.pickImage();
    });
    expect(screen.getByTestId('open')).toHaveTextContent('true');
    expect(screen.getByTestId('kind')).toHaveTextContent('image');
    expect(screen.getByTestId('accept')).toHaveTextContent('image/*,video/*');
    expect(screen.getByTestId('title')).toHaveTextContent('Add pod image');

    act(() => bridge.settlePicker('https://a.com/x.jpg'));
    await expect(picked!).resolves.toBe('https://a.com/x.jpg');
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('resolves a video pick and exposes video dialog props', async () => {
    let bridge!: Bridge;
    render(<Probe onBridge={(b) => { bridge = b; }} />);

    let picked: Promise<string | null>;
    act(() => {
      picked = bridge.pickVideo();
    });
    expect(screen.getByTestId('kind')).toHaveTextContent('video');
    expect(screen.getByTestId('accept')).toHaveTextContent('video/*');
    expect(screen.getByTestId('title')).toHaveTextContent('Pick reel video');

    act(() => bridge.settlePicker(null));
    await expect(picked!).resolves.toBeNull();
  });

  it('settling with no pending resolver is a no-op', () => {
    let bridge!: Bridge;
    render(<Probe onBridge={(b) => { bridge = b; }} />);
    expect(() => act(() => bridge.settlePicker('ignored'))).not.toThrow();
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });
});
