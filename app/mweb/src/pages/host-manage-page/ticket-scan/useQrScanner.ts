import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/** Rear camera where there is one — a host scans a ticket held up to them. */
const CAMERA: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' } },
  audio: false,
};

const stopTracks = (stream: MediaStream) => {
  for (const track of stream.getTracks()) track.stop();
};

function cameraErrorMessage(error: unknown) {
  const name = (error as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access for this site and try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device.';
  }
  return 'Could not start the camera. You can paste the ticket code instead.';
}

/** Decode the current video frame, or null when there is nothing readable yet. */
function readCode(video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null) {
  if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return null;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  const found = jsQR(ctx.getImageData(0, 0, width, height).data, width, height, {
    inversionAttempts: 'dontInvert',
  });
  return found?.data?.trim() || null;
}

/**
 * Live QR scanning off the device camera.
 *
 * `active` is the whole control surface: the caller turns it off the moment a
 * code is read (and while it shows the result), which both releases the camera
 * and stops the same ticket being submitted on every frame.
 */
export function useQrScanner(active: boolean, onCode: (value: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    setError(null);

    const scanFrame = () => {
      if (stopped) return;
      const value = readCode(videoRef.current, canvasRef.current);
      if (value) {
        onCodeRef.current(value);
        return;
      }
      frame = requestAnimationFrame(scanFrame);
    };

    const start = async () => {
      const media = await navigator.mediaDevices.getUserMedia(CAMERA);
      if (stopped) {
        stopTracks(media);
        return;
      }
      stream = media;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = media;
      await video.play();
      frame = requestAnimationFrame(scanFrame);
    };

    start().catch((e) => setError(cameraErrorMessage(e)));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      if (stream) stopTracks(stream);
    };
  }, [active]);

  return { videoRef, canvasRef, error };
}
