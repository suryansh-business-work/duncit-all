import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader } from '@duncit/ui';
import MediaPickerDialog from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import type useMediaPicker from './useMediaPicker';
import { revealFirstInvalid } from './revealFirstInvalid';

/**
 * The chrome every console's record editor wears.
 *
 * A venue's editor and a host's editor differ entirely in their SECTIONS and not
 * at all in their frame: back to the record, the title, Save in the header and
 * again at the foot, the save error, and the one media dialog their upload
 * fields resolve through. Written once so the two cannot drift into two ideas of
 * where Save lives (rule 34).
 *
 * Save appears TWICE on purpose. These pages are tall — a venue is eight
 * sections — and an admin who has scrolled to the bottom should not have to
 * scroll back up to commit what they just typed.
 */
export interface EditorPageShellProps {
  /** Small line above the heading, e.g. "Venues · Edit". */
  eyebrow: string;
  title: string;
  /** Where the back arrow and Cancel go — the record, or the list. */
  backTo: string;
  saveLabel: string;
  busy: boolean;
  error: string | null;
  /** The form's `handleSubmit(...)` — its promise settles once validation has run. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  /** The editor's media-picker bridge, so its upload fields resolve. */
  picker: ReturnType<typeof useMediaPicker>;
  children: ReactNode;
}

export default function EditorPageShell({
  eyebrow,
  title,
  backTo,
  saveLabel,
  busy,
  error,
  onSubmit,
  picker,
  children,
}: Readonly<EditorPageShellProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // Bumped after every Save; the effect runs once the errors that Save set have
  // rendered, so the field it reveals is already marked. With no field in error
  // the server refused it, and its message sits at the top of a tall page.
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (!attempts || revealFirstInvalid(formRef.current)) return;
    errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [attempts]);

  const submit = (event: FormEvent<HTMLFormElement>) =>
    onSubmit(event).then(() => setAttempts((count) => count + 1));

  const save = (
    <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={busy}>
      {saveLabel}
    </DuncitButton>
  );

  return (
    <>
      <form ref={formRef} onSubmit={submit} noValidate>
        <Stack spacing={2.5}>
          <BackHeader
            backTo={backTo}
            backAriaLabel={t('directory.venueEditor.backAria')}
            backSx={{ bgcolor: 'action.hover' }}
            eyebrow={eyebrow}
            title={title}
            titleWeight={950}
            titleSx={{ lineHeight: 1.1 }}
            actions={save}
          />

          {error && (
            <Alert ref={errorRef} severity="error">
              {error}
            </Alert>
          )}

          {children}

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton onClick={() => navigate(backTo)} disabled={busy}>
              {t('directory.venueEditor.cancel')}
            </DuncitButton>
            {save}
          </Stack>
        </Stack>
      </form>

      <MediaPickerDialog
        open={picker.open}
        onClose={() => picker.settle(null)}
        onPicked={(url) => picker.settle(url)}
        folder={picker.folder}
        title={t('directory.venueEditor.pickMedia')}
      />
    </>
  );
}
