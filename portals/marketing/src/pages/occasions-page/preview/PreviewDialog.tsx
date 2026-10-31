import { useId } from 'react';
import { Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { OccasionTheme } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { REGION_LABEL } from '../copy';
import { pinsColorMode } from './palette';
import ModeToggle from './ModeToggle';
import PhonePreview from './PhonePreview';
import { mwebPreviewUrl, usePreviewMode } from './usePreviewMode';

interface Props {
  look: OccasionTheme | null;
  onClose: () => void;
}

/** A look at full size and running, in light or dark, with a link to try it on mWeb. */
export default function PreviewDialog({ look, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [mode, setMode] = usePreviewMode();

  return (
    <Dialog open={!!look} onClose={onClose} aria-labelledby={titleId} maxWidth="sm" fullWidth>
      {look && (
        <>
          <DialogTitle id={titleId}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{look.name}</span>
              <Chip size="small" variant="outlined" label={t(REGION_LABEL[look.region])} />
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ alignItems: 'center', pt: 1 }}>
              <ModeToggle value={mode} onChange={setMode} pinned={pinsColorMode(look)} />
              <PhonePreview look={look} mode={mode} size="lg" label={t('marketing.occasions.preview.of', { vars: { name: look.name } })} />
              {look.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  {look.description}
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton
              href={mwebPreviewUrl(look.key)}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon />}
            >
              {t('marketing.occasions.openOnMweb')}
            </DuncitButton>
            <DuncitButton variant="contained" onClick={onClose}>
              {t('shell.common.close')}
            </DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
