import { Children, useId, useState, type ReactNode } from 'react';
import { Box, Collapse, Paper, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TourOutlinedIcon from '@mui/icons-material/TourOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { mergeSx } from '../mergeSx';
import { readGuideFlag, writeGuideFlag } from './guideStorage';

export interface PageIntroProps {
  /** Stable per page — the remembered open/closed state is keyed on it. */
  id: string;
  /** One line: what this page is for. */
  summary: ReactNode;
  /** What a person does here, in order. Drawn as a numbered list under "How this works". */
  steps?: ReactNode[];
  /** Offers a "Start tour" button — hand it `useFirstRunTour().start`. */
  onStartTour?: () => void;
  /** Defaults to `duncit.guide.<id>`. */
  storageKey?: string;
  sx?: SxProps<Theme>;
}

const COLLAPSED = '0';
const EXPANDED = '1';

/**
 * The block at the top of a console page that says what the page is for and,
 * folded under it, how it works. Whether the steps are open is remembered per
 * page: a first visit opens them, and a person who has folded them away is
 * not shown them again on every visit.
 */
export function PageIntro({ id, summary, steps, onStartTour, storageKey, sx }: Readonly<PageIntroProps>) {
  const { t } = useTranslation();
  const stepsId = useId();
  const key = storageKey ?? `duncit.guide.${id}`;
  const [expanded, setExpanded] = useState(() => readGuideFlag(key) !== COLLAPSED);
  const hasSteps = steps !== undefined && steps.length > 0;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    writeGuideFlag(key, next ? EXPANDED : COLLAPSED);
  };

  return (
    <Paper variant="outlined" data-testid="page-intro" sx={mergeSx({ p: 2, borderRadius: 2 }, sx)}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <InfoOutlinedIcon color="info" fontSize="small" aria-hidden sx={{ mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2">{summary}</Typography>
          {(hasSteps || onStartTour) && (
            <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {hasSteps && (
                <>
                  <Typography component="h2" variant="subtitle2" sx={{ flex: 1 }}>
                    {t('ui.guide.howThisWorks')}
                  </Typography>
                  <DuncitButton
                    size="small"
                    variant="text"
                    aria-expanded={expanded}
                    aria-controls={stepsId}
                    onClick={toggle}
                    startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {expanded ? t('ui.guide.hideSteps') : t('ui.guide.showSteps')}
                  </DuncitButton>
                </>
              )}
              {onStartTour && (
                <DuncitButton size="small" variant="text" startIcon={<TourOutlinedIcon />} onClick={onStartTour}>
                  {t('ui.guide.startTour')}
                </DuncitButton>
              )}
            </Stack>
          )}
          {hasSteps && (
            <Collapse in={expanded} id={stepsId}>
              <Box component="ol" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {Children.map(steps, (step) => (
                  <Typography component="li" variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    {step}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
