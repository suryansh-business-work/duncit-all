import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { RestError, uploadFile } from '../../../lib/rest';

/**
 * Images and PDFs attached to the next question. Each file is uploaded at once
 * to the person's own Media library (private, in the chat uploads folder) and
 * sent with the message by id; the server checks access again and gives the
 * model the image itself or the PDF's text. Allowed types and the size limit
 * come from Settings › Media & Uploads (via the bootstrap); the server is the
 * real gate.
 */

/** The same number the server allows (MAX_CHAT_ATTACHMENTS). */
export const MAX_ATTACHMENTS = 5;
const CHAT_TYPES = /^(?:image\/(?:png|jpe?g|webp|gif)|application\/pdf)$/;

export interface ChatAttachment {
  key: string;
  name: string;
  mime: string;
  progress: number;
  status: 'uploading' | 'done' | 'failed';
  /** The stored Media file, once uploaded. */
  id?: string;
  error?: string;
}

interface Options {
  maxMb: number;
  /** Media types the Media settings allow; only images and PDFs among them can be attached. */
  types: readonly string[];
}

export function useChatAttachments({ maxMb, types }: Options) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ChatAttachment[]>([]);
  const aborts = useRef(new Map<string, () => void>());
  const accepted = types.filter((type) => CHAT_TYPES.test(type));
  const patch = (key: string, values: Partial<ChatAttachment>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...values } : i)));

  const upload = useCallback(
    (file: File) => {
      const key = crypto.randomUUID();
      setItems((prev) => [...prev, { key, name: file.name, mime: file.type, progress: 0, status: 'uploading' }]);
      const { promise, abort } = uploadFile<{ id: string }>(file, { folder: `/${t('intel.composer.attachFolder')}`, visibility: 'PRIVATE' }, (progress) => patch(key, { progress }));
      aborts.current.set(key, abort);
      promise
        .then((stored) => patch(key, { status: 'done', progress: 100, id: stored.id }))
        .catch((err: unknown) => patch(key, { status: 'failed', error: err instanceof RestError ? err.message : t('intel.media.uploadFailed') }))
        .finally(() => aborts.current.delete(key));
    },
    [t]
  );

  const add = (files: FileList | File[]) => {
    const list = Array.from(files);
    const room = MAX_ATTACHMENTS - items.length;
    if (list.length > room) notifyError(t('intel.composer.attachTooMany', { vars: { max: MAX_ATTACHMENTS } }));
    for (const file of list.slice(0, Math.max(room, 0))) {
      if (!accepted.includes(file.type)) notifyError(t('intel.composer.attachTypeRefused', { vars: { name: file.name } }));
      else if (file.size > maxMb * 1024 * 1024) notifyError(t('intel.composer.attachTooLarge', { vars: { name: file.name, max: maxMb } }));
      else upload(file);
    }
  };

  const remove = (key: string) => {
    aborts.current.get(key)?.();
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  return {
    items,
    accept: accepted.join(','),
    add,
    remove,
    clear: () => setItems([]),
    uploading: items.some((i) => i.status === 'uploading'),
    ids: items.flatMap((i) => (i.status === 'done' && i.id ? [i.id] : [])),
    full: items.length >= MAX_ATTACHMENTS,
  };
}
