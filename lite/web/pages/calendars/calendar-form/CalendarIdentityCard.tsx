import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Card, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { STORAGE_KEYS } from '../../../../shared/env';
import { useWebT } from '../../../../shared/i18n';
import { PictureDialog } from '../../../../shared/picture-picker';
import { accentWash } from '../../../../shared/theme';
import { ACCENT_COLORS } from '../../../../shared/tokens';
import { UserAvatar } from '../../../components/UserAvatar';
import type { CalendarValues } from './calendar.types';
import { CalendarTextFields } from './CalendarTextFields';

type Picking = 'cover' | 'avatar' | null;

const AVATAR = 72;
/** A small round control pinned to a corner of the avatar. */
const BADGE = { position: 'absolute', width: 28, height: 28, p: 0, bgcolor: 'background.paper', border: 1, borderColor: 'divider', '&:hover': { bgcolor: 'background.paper' } } as const;

/** The top of the form as the page will look: cover, avatar over its edge, then the name and description. */
export function CalendarIdentityCard() {
  const { t } = useWebT();
  const { control, setValue, formState } = useFormContext<CalendarValues>();
  const [cover, avatar, name, accent] = useWatch({ control, name: ['cover_url', 'avatar_url', 'name', 'tint'] });
  const [picking, setPicking] = useState<Picking>(null);
  const put = (field: 'cover_url' | 'avatar_url', url: string) => setValue(field, url, { shouldDirty: true, shouldValidate: true });
  const pictureError = formState.errors.cover_url?.message ?? formState.errors.avatar_url?.message;

  return (
    <Card data-testid="calendar-identity">
      <Box sx={{ position: 'relative', height: { xs: 140, sm: 200 }, background: cover ? undefined : accentWash(ACCENT_COLORS[accent]) }}>
        {cover ? <Box component="img" src={cover} alt="" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} data-testid="calendar-cover-preview" /> : null}
        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 12, right: 12 }}>
          {cover ? (
            <DuncitIconButton aria-label={t('liteWeb.calendars.removeCover')} onClick={() => put('cover_url', '')} sx={{ ...BADGE, position: 'static', width: 32, height: 32 }} data-testid="calendar-cover-remove">
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          ) : null}
          <DuncitButton size="small" variant="contained" color="inherit" startIcon={<ImageOutlinedIcon />} onClick={() => setPicking('cover')} data-testid="calendar-cover-change">
            {cover ? t('liteWeb.calendars.changeCover') : t('liteWeb.calendars.addCover')}
          </DuncitButton>
        </Stack>
      </Box>
      <Stack spacing={2} sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
        <Box sx={{ position: 'relative', width: AVATAR, height: AVATAR, mt: `-${AVATAR / 2}px`, borderRadius: 2, boxShadow: (theme) => `0 0 0 3px ${theme.vars?.palette.background.paper}` }}>
          <UserAvatar name={name || t('liteWeb.calendars.namePlaceholder')} url={avatar || null} size={AVATAR} square />
          <DuncitIconButton aria-label={t('liteWeb.calendars.changeAvatar')} onClick={() => setPicking('avatar')} sx={{ ...BADGE, right: -8, bottom: -8 }} data-testid="calendar-avatar-change">
            <FileUploadOutlinedIcon sx={{ fontSize: 16 }} />
          </DuncitIconButton>
          {avatar ? (
            <DuncitIconButton aria-label={t('liteWeb.calendars.removeAvatar')} onClick={() => put('avatar_url', '')} sx={{ ...BADGE, right: -8, top: -8 }} data-testid="calendar-avatar-remove">
              <CloseIcon sx={{ fontSize: 16 }} />
            </DuncitIconButton>
          ) : null}
        </Box>
        <CalendarTextFields />
        {pictureError ? (
          <Typography role="alert" variant="body2" color="error">
            {pictureError}
          </Typography>
        ) : null}
      </Stack>
      <PictureDialog
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPicked={(url) => {
          put(picking === 'avatar' ? 'avatar_url' : 'cover_url', url);
          setPicking(null);
        }}
        shape={picking === 'avatar' ? 'avatar' : 'cover'}
        tokenKey={STORAGE_KEYS.token}
        testId="calendar-picture"
      />
    </Card>
  );
}
