import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import SignaturePad from '../../src/components/SignaturePad';
import type { SignatureMethod } from '../../src/graphql/documents';
import { renderWithProviders } from '../testkit';

/**
 * The signature capture: draw, type or upload, and always one PNG data URL out.
 *
 * jsdom has no canvas backend, so the 2D context is a recording stand-in and
 * `toDataURL` returns a fixed PNG. What is asserted is the component's own
 * work — where the ink goes, what it hands back, and which method it names.
 */
const PNG = 'data:image/png;base64,U0lHTkFUVVJF';

interface FakeContext {
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  lineWidth: number;
  lineCap: string;
  strokeStyle: string;
  fillStyle: string;
  font: string;
  textBaseline: string;
}

const makeContext = (): FakeContext => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  lineWidth: 0,
  lineCap: '',
  strokeStyle: '',
  fillStyle: '',
  font: '',
  textBaseline: '',
});

let ctx: FakeContext;

beforeEach(() => {
  ctx = makeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(PNG);
  // The drawn canvas is 520×160 but shown at 260×80, so points scale by two.
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 260,
    bottom: 80,
    width: 260,
    height: 80,
    toJSON: () => ({}),
  });
  // jsdom implements no pointer capture.
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface RenderOptions {
  methods?: SignatureMethod[];
  value?: string;
  method?: SignatureMethod | null;
  typedName?: string;
}

const renderPad = ({
  methods = ['DRAW', 'TYPE', 'UPLOAD'],
  value = '',
  method = null,
  typedName = '',
}: RenderOptions = {}) => {
  const onChange = vi.fn();
  const view = renderWithProviders(
    <SignaturePad
      methods={methods}
      value={value}
      method={method}
      typedName={typedName}
      onChange={onChange}
    />,
  );
  return { onChange, view };
};

const canvasOf = (container: HTMLElement) => container.querySelector('canvas') as HTMLCanvasElement;
const fileInputOf = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

describe('SignaturePad — drawing', () => {
  it('opens on the first allowed method and draws a stroke into a PNG', () => {
    const { onChange, view } = renderPad();
    expect(screen.getByRole('tab', { name: 'Draw' })).toHaveAttribute('aria-selected', 'true');
    const canvas = canvasOf(view.container);

    // Moving before pressing draws nothing.
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    expect(ctx.lineTo).not.toHaveBeenCalled();

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(20, 40);

    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 40, pointerId: 1 });
    expect(ctx.lineTo).toHaveBeenCalledWith(60, 80);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.strokeStyle).toBe('#111827');

    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onChange).toHaveBeenCalledWith(PNG, 'DRAW');

    // Leaving after the stroke ended does not hand the image back twice.
    fireEvent.pointerLeave(canvas, { pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('clears the canvas and the captured signature', () => {
    const { onChange, view } = renderPad();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvasOf(view.container).width, 160);
    expect(onChange).toHaveBeenCalledWith('', 'DRAW');
  });

  it('draws nothing when the browser offers no 2D context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { onChange, view } = renderPad();
    const canvas = canvasOf(view.container);

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('SignaturePad — typing', () => {
  it('renders the typed name as an image in the signature font', () => {
    const { onChange } = renderPad({ method: 'TYPE', typedName: 'Asha Rao' });
    const field = screen.getByLabelText('Type your signature');
    // The signer's own name from the form is the hint.
    expect(field).toHaveAttribute('placeholder', 'Asha Rao');

    fireEvent.change(field, { target: { value: 'Asha Rao' } });
    expect(ctx.fillText).toHaveBeenCalledWith('Asha Rao', 16, 80);
    expect(ctx.font).toContain('italic');
    expect(onChange).toHaveBeenLastCalledWith(PNG, 'TYPE');

    // Erasing it hands back an empty signature, not a blank image.
    fireEvent.change(field, { target: { value: '   ' } });
    expect(onChange).toHaveBeenLastCalledWith('', 'TYPE');
  });

  it('hands back no image when the browser cannot render the text', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { onChange } = renderPad({ method: 'TYPE' });
    const field = screen.getByLabelText('Type your signature');
    expect(field).toHaveAttribute('placeholder', 'Your name');

    fireEvent.change(field, { target: { value: 'Asha Rao' } });
    expect(onChange).toHaveBeenCalledWith('', 'TYPE');
  });

  it('previews a typed signature it already holds', () => {
    renderPad({ method: 'TYPE', value: PNG });
    expect(screen.getByAltText('Typed signature preview')).toHaveAttribute('src', PNG);
  });

  it('switches methods from the tab strip', () => {
    renderPad();
    fireEvent.click(screen.getByRole('tab', { name: 'Type' }));
    expect(screen.getByLabelText('Type your signature')).toBeInTheDocument();
  });
});

describe('SignaturePad — uploading', () => {
  const pick = (container: HTMLElement, files: File[]) =>
    fireEvent.change(fileInputOf(container), { target: { files } });

  it('reads a picked image into a data URL', async () => {
    const { onChange, view } = renderPad({ method: 'UPLOAD' });
    pick(view.container, [new File(['signature'], 'signature.png', { type: 'image/png' })]);
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), 'UPLOAD'),
    );
  });

  it('ignores a picker that was closed without a file', () => {
    const { onChange, view } = renderPad({ method: 'UPLOAD' });
    pick(view.container, []);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a file that is not an image', () => {
    const { onChange, view } = renderPad({ method: 'UPLOAD' });
    pick(view.container, [new File(['%PDF'], 'contract.pdf', { type: 'application/pdf' })]);
    expect(screen.getByText('Upload an image file.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses an image over 5 MB', () => {
    const { onChange, view } = renderPad({ method: 'UPLOAD' });
    const big = new File(['x'], 'scan.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    pick(view.container, [big]);
    expect(screen.getByText('That image is over 5 MB. Choose a smaller one.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says so when the image cannot be read', () => {
    class UnreadableFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', UnreadableFileReader);
    const { onChange, view } = renderPad({ method: 'UPLOAD' });
    pick(view.container, [new File(['signature'], 'signature.png', { type: 'image/png' })]);
    expect(screen.getByText('That image could not be read.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('previews an uploaded signature it already holds', () => {
    renderPad({ method: 'UPLOAD', value: PNG });
    expect(screen.getByAltText('Uploaded signature preview')).toHaveAttribute('src', PNG);
  });
});

describe('SignaturePad — allowed methods', () => {
  it('moves off a method the platform does not allow', async () => {
    renderPad({ methods: ['TYPE'], method: 'UPLOAD' });
    expect(await screen.findByLabelText('Type your signature')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Upload' })).not.toBeInTheDocument();
  });

  it('explains that every method is switched off', () => {
    renderPad({ methods: [] });
    expect(
      screen.getByText(/Every signing method is switched off for this platform/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
