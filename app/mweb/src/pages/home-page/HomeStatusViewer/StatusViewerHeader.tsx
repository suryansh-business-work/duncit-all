import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import type { HomeStatusViewerItem, HomeStatusViewerSlide } from './types';

interface StatusViewerHeaderProps {
  item: HomeStatusViewerItem;
  slides: HomeStatusViewerSlide[];
  index: number;
  progress: number;
  current?: HomeStatusViewerSlide;
  timeLabel: string | null;
  openAuthor: () => void;
  /** The mute / like / viewers / menu / close cluster on the right. */
  actions: ReactNode;
}

/** Progress bars over the author row of the story viewer. */
export default function StatusViewerHeader({
  item,
  slides,
  index,
  progress,
  current,
  timeLabel,
  openAuthor,
  actions,
}: Readonly<StatusViewerHeaderProps>) {
  const { t } = useTranslation();
  const authorProps = item.authorId
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': t('mweb.podDetails.openProfileOf', { vars: { name: item.label } }),
        'data-testid': 'status-author',
        onClick: openAuthor,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openAuthor();
          }
        },
      }
    : {};

  return (
    <Stack spacing={1.2} sx={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3 }}>
      <Stack direction="row" spacing={0.5}>
        {slides.map((slide, slideIndex) => {
          let fill = 0;
          if (slideIndex < index) fill = 1;
          else if (slideIndex === index) fill = progress;
          return (
            <Box key={slide.id ?? slide.mediaUrl ?? item.label} sx={{ flex: 1, height: 3, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${fill * 100}%`, borderRadius: 'inherit', bgcolor: '#fff' }} />
            </Box>
          );
        })}
      </Stack>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Box
          component={item.avatarUrl ? 'img' : 'div'}
          src={item.avatarUrl || undefined}
          alt=""
          aria-hidden
          onClick={item.authorId ? openAuthor : undefined}
          sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', bgcolor: 'primary.main', cursor: item.authorId ? 'pointer' : 'default' }}
        />
        <Box {...authorProps} sx={{ minWidth: 0, flex: 1, cursor: item.authorId ? 'pointer' : 'default' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
            {item.label}
          </Typography>
          {(current?.subLabel || item.subLabel || timeLabel) && (
            <Typography variant="caption" sx={{ opacity: 0.78 }} noWrap>
              {[current?.subLabel || item.subLabel, timeLabel].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </Box>
        {actions}
      </Stack>
    </Stack>
  );
}
