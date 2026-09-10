import { useRef, useState, type ChangeEvent } from 'react';
import ImageIcon from '@mui/icons-material/Image';
import { LinearProgress } from '@mui/material';
import type { Editor } from '@tiptap/react';
import { useImagekitBase64Upload } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import { ToolbarButton } from './ToolbarButton';

/**
 * Module-level key references for the verification scanner (rule 38). Same
 * reason the toolbar and the table menu carry their own blocks. Do not remove.
 */
const KEY_REFERENCES = {
  image: 'shell.richText.image',
  imageUploading: 'shell.richText.imageUploading',
  imageFailed: 'shell.richText.imageFailed',
} as const;

/**
 * The picture button: choose a file, watch it upload, get it in the document.
 *
 * The upload goes through `useImagekitBase64Upload` from `@duncit/media-picker`
 * — the ONE ImageKit path in the repo. Hand-rolling the mutation here would be a
 * second copy of the upload contract (rule 40), and it is the copy that would
 * drift the day the server starts asking for a surface or a crop preset.
 *
 * Nothing is inserted until the URL comes back. Inserting a local `blob:` first
 * and swapping it afterwards would look faster and put an unreachable src in the
 * saved HTML for anybody whose upload then failed.
 */
interface Props {
  editor: Editor;
  /** ImageKit folder for pictures dropped into rich text. */
  folder: string;
  /** Told when an upload fails, so the editor can say so where the AI error goes. */
  onError: (failed: boolean) => void;
}

export function ImageButton({ editor, folder, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { upload } = useImagekitBase64Upload();
  const [pct, setPct] = useState<number | null>(null);

  const uploading = pct !== null;

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the input is what lets the same file be picked twice in a row —
    // without it the change event never fires again.
    event.target.value = '';
    if (!file) return;
    onError(false);
    setPct(0);
    upload(file, { folder, onProgress: setPct })
      .then((result) => {
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
      })
      .catch(() => onError(true))
      .finally(() => setPct(null));
  };

  return (
    <>
      <ToolbarButton
        label={t(uploading ? KEY_REFERENCES.imageUploading : KEY_REFERENCES.image)}
        disabled={uploading}
        onPress={() => inputRef.current?.click()}
      >
        <ImageIcon fontSize="small" />
      </ToolbarButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={t(KEY_REFERENCES.image)}
        onChange={choose}
      />
      {uploading ? (
        // Determinate while the FILE is being read, which is the only part with a
        // real number behind it, then indeterminate while the server does the
        // ImageKit round trip — a bar that sat at 55% would be inventing progress.
        <LinearProgress
          aria-label={t(KEY_REFERENCES.imageUploading)}
          variant={pct < 55 ? 'determinate' : 'indeterminate'}
          value={pct}
          sx={{ bottom: 0, left: 0, position: 'absolute', right: 0 }}
        />
      ) : null}
    </>
  );
}
