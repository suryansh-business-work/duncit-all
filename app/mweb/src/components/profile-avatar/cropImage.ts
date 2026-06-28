export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Edge of the square avatar we output (px). */
const OUTPUT_SIZE = 720;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load the selected image')));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = src;
  });
}

/**
 * Crop + rotate the source image to the chosen square and export a JPEG data URL
 * ready for upload (item 9 crop + zoom + rotate). `area` comes from react-easy-crop
 * in source pixels; `rotation` is applied around the image centre first.
 */
export async function getCroppedImage(
  src: string,
  area: PixelArea,
  rotation: number,
): Promise<string> {
  const image = await loadImage(src);
  const radians = (rotation * Math.PI) / 180;

  // Draw the (rotated) full image onto a scratch canvas, then copy the crop box.
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d');
  if (!sctx) throw new Error('Canvas is not supported');
  const turned = rotation % 180 !== 0;
  scratch.width = turned ? image.height : image.width;
  scratch.height = turned ? image.width : image.height;
  sctx.translate(scratch.width / 2, scratch.height / 2);
  sctx.rotate(radians);
  sctx.drawImage(image, -image.width / 2, -image.height / 2);

  const out = document.createElement('canvas');
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas is not supported');
  octx.drawImage(
    scratch,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return out.toDataURL('image/jpeg', 0.85);
}
