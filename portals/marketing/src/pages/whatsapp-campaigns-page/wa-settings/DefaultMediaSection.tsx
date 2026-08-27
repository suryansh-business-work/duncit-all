import { Alert, Paper, Stack, Typography } from '@mui/material';
import { DefaultMediaForm, type DefaultMediaKind, type DefaultMediaValues } from './default-media-form';

interface Props {
  kind: DefaultMediaKind;
  title: string;
  body: string;
  /** Shown while nothing is set — every scenario of this header kind fails until
   * one is, which is worth saying on the screen that fixes it. */
  noneWarning: string;
  savedUrl: string;
  savedFilename: string;
  busy: boolean;
  loaded: boolean;
  onSubmit: (kind: DefaultMediaKind, values: DefaultMediaValues) => Promise<void>;
}

/**
 * One platform default, framed. Two of these sit on the Settings tab — an image
 * and a document — because one picture cannot stand in for a file header.
 */
export default function DefaultMediaSection({
  kind,
  title,
  body,
  noneWarning,
  savedUrl,
  savedFilename,
  busy,
  loaded,
  onSubmit,
}: Readonly<Props>) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {body}
          </Typography>
        </Stack>

        {loaded && !savedUrl && <Alert severity="warning">{noneWarning}</Alert>}

        <DefaultMediaForm
          kind={kind}
          savedUrl={savedUrl}
          savedFilename={savedFilename}
          busy={busy}
          onSubmit={(values) => onSubmit(kind, values)}
        />
      </Stack>
    </Paper>
  );
}
