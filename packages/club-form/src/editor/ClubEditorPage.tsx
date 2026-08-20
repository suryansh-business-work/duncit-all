import type { ReactNode } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { UseFormReturn } from 'react-hook-form';
import ClubForm from '../ClubForm';
import ClubPreview from '../preview/ClubPreview';
import type { ClubAdmin, ClubFormConfig, ClubFormValues } from '../types';

export interface ClubEditorPageProps {
  /** Small line above the heading, e.g. "Admin · Clubs". */
  eyebrow: string;
  /** Overrides the "New Club" / "Edit Club" heading (the club-admin page names
   * the club it is editing). */
  heading?: string;
  /** Where the back button and Cancel go. */
  onBack: () => void;
  backLabel: string;
  initialValues: ClubFormValues;
  initialAdmins?: ClubAdmin[];
  config: ClubFormConfig;
  busy: boolean;
  error: string | null;
  onSubmit: (values: ClubFormValues, options: { draft: boolean }) => Promise<void> | void;
  onPickImage?: (folder?: string) => Promise<string | null>;
  onReady?: (methods: UseFormReturn<ClubFormValues>) => void;
  /** Extra heading-row content (e.g. the admin AI-fill button). */
  titleExtras?: ReactNode;
  /** Content rendered above the form. */
  intro?: ReactNode;
}

/**
 * Full-page "New Club / Edit Club" editor: the shared ClubForm on the left and
 * the live member preview on the right.
 *
 * It replaced a `maxWidth="md"` dialog. A club carries five sections of page
 * copy — bullets, perks, values and FAQs a member actually reads — and none of
 * that could be judged inside a modal that showed neither the copy at length
 * nor the page it lands on.
 */
export default function ClubEditorPage({
  eyebrow,
  heading,
  onBack,
  backLabel,
  initialValues,
  initialAdmins,
  config,
  busy,
  error,
  onSubmit,
  onPickImage,
  onReady,
  titleExtras,
  intro,
}: Readonly<ClubEditorPageProps>) {
  const defaultHeading = initialValues.id ? 'Edit Club' : 'New Club';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <Stack spacing={0.25}>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>
                {eyebrow}
              </Typography>
              <Typography variant="h6" fontWeight={950}>
                {heading ?? defaultHeading}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {titleExtras}
              <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
                {backLabel}
              </Button>
            </Stack>
          </Stack>

          {intro}

          <ClubForm
            initialValues={initialValues}
            config={config}
            initialAdmins={initialAdmins}
            onPickImage={onPickImage}
            busy={busy}
            error={error}
            onCancel={onBack}
            onSubmit={onSubmit}
            onReady={onReady}
            preview={<ClubPreview />}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
