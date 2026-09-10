import { useRef, useState, type ChangeEvent } from 'react';
import ImageIcon from '@mui/icons-material/Image';
import { LinearProgress } from '@mui/material';
import type { Editor } from '@tiptap/react';
import { useImagekitDirectUpload } from '@duncit/media-picker';
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
 * The upload goes through `useImagekitDirectUpload` from `@duncit/media-picker`
 * — an existing ImageKit path rather than a second copy of the upload contract
 * (rule 40), which is the copy that would drift the day the server starts asking
 * for a surface or a crop preset.
 *
 * `useImagekitDirectUpload` rather than its base64 sibling for two reasons, both
 * about a photo straight off a phone. It streams the bytes over XHR, so it is the
 * only one that reports REAL progress — the base64 flavour reports a single 55
 * once the file is read, which is a bar that can be empty or animating and never
 * anything in between. And base64 costs a third more than the file, so a large
 * picture can miss the API body limit for no reason.
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
  const { upload } = useImagekitDirectUpload();
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
    upload(file, folder, setPct)
      .then((url) => {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
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
        // Determinate while the bytes are going up, because XHR reports those
        // honestly. Once they are all sent the server still has its own hop to
        // ImageKit with nothing to report, so the bar stops claiming to know
        // rather than sitting at 100% pretending to be finished.
        <LinearProgress
          aria-label={t(KEY_REFERENCES.imageUploading)}
          variant={pct < 100 ? 'determinate' : 'indeterminate'}
          value={pct}
          sx={{ bottom: 0, left: 0, position: 'absolute', right: 0 }}
        />
      ) : null}
    </>
  );
}
