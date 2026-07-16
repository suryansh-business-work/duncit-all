import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useApolloClient } from '@apollo/client';
import { uploadImageToImagekit } from './upload';
import { validateFile } from './utils';
import type { FilePolicy } from './types';

interface Args extends FilePolicy {
  open: boolean;
  folder: string;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export function useDeviceUpload({
  open,
  folder,
  allowImage,
  allowVideo,
  allowDocuments,
  onPicked,
  onClose,
  setError,
}: Args) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const client = useApolloClient();

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

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const problem = validateFile(f, { allowImage, allowVideo, allowDocuments });
    if (problem) {
      setError(problem);
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
      const { url } = await uploadImageToImagekit(client, picked, {
        folder,
        allowDocuments,
        onProgress: setUploadPct,
      });
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
