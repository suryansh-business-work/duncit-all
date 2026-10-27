import { useRef, type ReactNode } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  exporting: boolean;
  importing: boolean;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  /** The accessible name of the hidden JSON file picker. */
  fileLabel: string;
  /** Rendered after Import — the table's copy-API link. */
  children?: ReactNode;
}

/**
 * Export and Import buttons for a table carried in and out as a JSON file — the
 * bug and telemetry log tables share them. The picker is hidden and opened by
 * the Import button.
 */
export default function JsonImportExportButtons({
  exporting,
  importing,
  onExport,
  onImport,
  fileLabel,
  children,
}: Readonly<Props>) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <DuncitButton size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={onExport}>
        {exporting ? 'Exporting…' : 'Export'}
      </DuncitButton>
      <DuncitButton
        size="small"
        startIcon={<UploadIcon />}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import'}
      </DuncitButton>
      {children}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={fileLabel}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Cleared so picking the SAME file again still fires a change event.
          e.target.value = '';
          if (file) await onImport(file);
        }}
      />
    </>
  );
}
