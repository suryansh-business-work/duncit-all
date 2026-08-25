import { Box, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { RhfTextField } from '@duncit/forms';
import type { CaptchaCopy } from '@duncit/i18n';
import type { Control, FieldValues, Path } from 'react-hook-form';
import type { CaptchaState } from './useCaptcha';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** The field holding what the visitor typed — the token is not form state. */
  name: Path<T>;
  captcha: CaptchaState;
  copy: CaptchaCopy;
}

/**
 * The MUI half of the check: the picture, a reload, and the box to type it in.
 *
 * The picture is the same SVG the plain-HTML widget renders — it is drawn by
 * the server, so the two surfaces cannot drift into showing different codes for
 * the same token.
 */
export default function CaptchaField<T extends FieldValues>({
  control,
  name,
  captcha,
  copy,
}: Readonly<Props<T>>) {
  // Hoisted out of the JSX so the branch sits at nesting 0 (SonarQube S3776).
  const hint = captcha.failed ? copy.unavailable : copy.hint;

  return (
    <Box>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          letterSpacing: '0.12em',
          fontWeight: 700
        }}>
        {copy.title}
      </Typography>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "flex-start",
          mt: 0.5
        }}>
        {captcha.image ? (
          <Box
            component="img"
            src={captcha.image}
            alt={copy.imageAlt}
            sx={{
              width: 180,
              height: 60,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              flexShrink: 0
            }} />
        ) : (
          <Skeleton variant="rounded" width={180} height={60} sx={{ flexShrink: 0 }} />
        )}
        <Tooltip title={copy.refresh}>
          <span>
            <IconButton
              onClick={captcha.reload}
              disabled={captcha.loading}
              aria-label={copy.refresh}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <RhfTextField
          control={control}
          name={name}
          size="small"
          label={copy.label}
          hint={hint}
          autoComplete="off"
          spellCheck={false}
          slotProps={{ htmlInput: { maxLength: 8, style: { textTransform: 'uppercase', letterSpacing: 4 } } }}
        />
      </Stack>
    </Box>
  );
}
