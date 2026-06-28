import * as ImageManipulator from 'expo-image-manipulator';

import { cropToAvatar, squareCropRect } from '@/components/profile/crop/cropImage';

const manipulate = ImageManipulator.manipulateAsync as jest.Mock;

beforeEach(() => {
  manipulate.mockReset().mockResolvedValue({ uri: 'file://out.jpg', base64: 'OUT' });
});

describe('squareCropRect', () => {
  it('centres a full-size square on a landscape image at zoom 1', () => {
    const rect = squareCropRect(1000, 600, 1);
    expect(rect).toEqual({ originX: 200, originY: 0, width: 600, height: 600 });
  });

  it('shrinks and re-centres the square as zoom increases', () => {
    const rect = squareCropRect(600, 600, 2);
    expect(rect.width).toBe(300);
    expect(rect.originX).toBe(150);
  });
});

describe('cropToAvatar', () => {
  it('crops + resizes without rotation', async () => {
    const result = await cropToAvatar({
      uri: 'file://p.jpg',
      width: 800,
      height: 800,
      zoom: 1,
      rotation: 0,
    });
    const actions = manipulate.mock.calls[0]?.[1];
    expect(actions.some((a: { rotate?: number }) => a.rotate !== undefined)).toBe(false);
    expect(result.base64).toBe('OUT');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.fileName).toMatch(/^avatar-\d+\.jpg$/);
  });

  it('rotates first and swaps the frame dimensions for a 90° turn', async () => {
    await cropToAvatar({ uri: 'file://p.jpg', width: 1000, height: 600, zoom: 1, rotation: 90 });
    const actions = manipulate.mock.calls[0]?.[1];
    expect(actions[0]).toEqual({ rotate: 90 });
    // After a 90° turn the frame is 600×1000, so the square side is 600.
    expect(actions[1].crop.width).toBe(600);
  });

  it('falls back to an empty base64 when the native result omits it', async () => {
    manipulate.mockResolvedValue({ uri: 'file://out.jpg' });
    const result = await cropToAvatar({
      uri: 'file://p.jpg',
      width: 400,
      height: 400,
      zoom: 1,
      rotation: 180,
    });
    expect(result.base64).toBe('');
  });
});
