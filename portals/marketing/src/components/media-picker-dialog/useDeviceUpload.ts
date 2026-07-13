import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPLOAD_IMAGE } from './queries';

interface Args {
  open: boolean;
  folder: string;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export function useDeviceUpload({ open, folder, onPicked, onClose, setError }: Args) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [uploadImageMut] = useMutation(UPLOAD_IMAGE);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setPreviewUrl(null);
    setUploadPct(null);
    setUploading(false);
  }, [open]);

  useEffect(() => {
    if (!picked) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(picked);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [picked]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Please choose an image or video file');
      return;
    }
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (f.size > maxBytes) {
      setError(
        isVideo ? 'Video is too large (max 100 MB)' : 'Image is too large (max 15 MB)'
      );
      return;
    }
    setError(null);
    setPicked(f);
  };

  const uploadFromDevice = async () => {
    if (!picked) return;
    setUploading(true);
    setUploadPct(10);
    setError(null);
    try {
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Could not read selected file'));
        reader.readAsDataURL(picked);
      });
      setUploadPct(55);
      const res = await uploadImageMut({
        variables: {
          fileBase64,
          fileName: picked.name,
          mimeType: picked.type,
          folder,
        },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('No URL returned from ImageKit upload');
      setUploadPct(100);
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

  return {
    fileInputRef,
    picked,
    previewUrl,
    uploadPct,
    uploading,
    onPickFile,
    uploadFromDevice,
  };
}
