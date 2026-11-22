import { useRef } from 'react';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  label: string;
  /** MIME types offered by the file chooser. */
  accept: readonly string[];
  busy?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
  testId?: string;
}

/** A button that opens the file chooser for images and hands back what was picked. */
export default function ImageUploadButton({ label, accept, busy, disabled, multiple = true, onFiles, testId }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept.join(',')}
        data-testid={testId}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <DuncitButton
        size="small"
        variant="contained"
        startIcon={<UploadIcon />}
        loading={busy}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </DuncitButton>
    </>
  );
}
