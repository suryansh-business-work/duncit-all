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
      <span data-testid="seed">{bridge.seedQuery}</span>
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
    // Opened with no options: the picker searches nothing until it is told to.
    expect(screen.getByTestId('seed')).toHaveTextContent('');

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

  // The form knows the pod's category, so the picker opens on it rather than
  // making the user type what the form already holds.
  it('carries the caller’s Pexels seed into the dialog props, for either kind', () => {
    let bridge!: Bridge;
    render(<Probe onBridge={(b) => { bridge = b; }} />);

    act(() => {
      bridge.pickImage({ seedQuery: 'Badminton group of people' }).catch(() => undefined);
    });
    expect(screen.getByTestId('seed')).toHaveTextContent('Badminton group of people');

    act(() => bridge.settlePicker(null));
    act(() => {
      bridge.pickVideo({ seedQuery: 'Chess group of people' }).catch(() => undefined);
    });
    expect(screen.getByTestId('kind')).toHaveTextContent('video');
    expect(screen.getByTestId('seed')).toHaveTextContent('Chess group of people');
  });

  it('settling with no pending resolver is a no-op', () => {
    let bridge!: Bridge;
    render(<Probe onBridge={(b) => { bridge = b; }} />);
    expect(() => act(() => bridge.settlePicker('ignored'))).not.toThrow();
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });
});
