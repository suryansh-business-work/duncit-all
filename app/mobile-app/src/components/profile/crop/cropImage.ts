import * as ImageManipulator from 'expo-image-manipulator';

import type { CroppedPhoto } from '@/hooks/useProfilePhoto';

/** Output edge of the square avatar we produce (px). */
const OUTPUT_SIZE = 720;

export interface CropParams {
  uri: string;
  /** Source pixel dimensions of the picked image. */
  width: number;
  height: number;
  /** 1 = no zoom; >1 zooms in (centered). */
  zoom: number;
  /** Clockwise rotation in degrees (0/90/180/270). */
  rotation: number;
}

/** The largest centered square (in source pixels) for a given zoom level. */
export function squareCropRect(width: number, height: number, zoom: number) {
  const side = Math.min(width, height) / zoom;
  return {
    originX: (width - side) / 2,
    originY: (height - side) / 2,
    width: side,
    height: side,
  };
}

/**
 * Rotate then center-crop the picked image to a square and resize to the avatar
 * output size, returning base64 ready for upload. Uses expo-image-manipulator so
 * the heavy pixel work runs natively (item 9 crop + zoom + rotate).
 */
export async function cropToAvatar({
  uri,
  width,
  height,
  zoom,
  rotation,
}: CropParams): Promise<CroppedPhoto> {
  // After a 90°/270° turn the post-rotation frame swaps its width and height.
  const turned = rotation % 180 !== 0;
  const frameW = turned ? height : width;
  const frameH = turned ? width : height;
  const crop = squareCropRect(frameW, frameH, zoom);

  const actions: ImageManipulator.Action[] = [];
  if (rotation) actions.push({ rotate: rotation });
  actions.push({ crop });
  actions.push({ resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } });

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  return {
    base64: result.base64 ?? '',
    mimeType: 'image/jpeg',
    fileName: `avatar-${Date.now()}.jpg`,
  };
}
