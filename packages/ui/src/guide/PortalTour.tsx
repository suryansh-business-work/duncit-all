import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Box, Paper, Popper, Stack, Typography, alpha, type Theme } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { resolveTourSteps, useTourTarget, type PortalTourStep, type ResolvedTourStep } from './useTourTarget';

export interface PortalTourProps {
  open: boolean;
  steps: readonly PortalTourStep[];
  /** `completed` is true after Done; false after Skip, Escape, or when no step could be shown. */
  onClose: (completed: boolean) => void;
  /** Index into `steps` to begin from. Default 0. */
  startAt?: number;
}

/** How dark the rest of the page goes while a step is shown. */
const SHADE = 0.55;

/**
 * A spotlight tour over the page's own elements, with no dependency: each
 * step darkens everything but the element tagged `data-tour="<anchor>"` and
 * anchors a small card to it. Steps whose element is not on the page are
 * skipped, and a tour with nothing to show closes itself as not completed.
 *
 * Nothing in it moves, so there is nothing to switch off under
 * `prefers-reduced-motion`.
 */
export function PortalTour({ open, steps, onClose, startAt = 0 }: Readonly<PortalTourProps>) {
  // Mounted fresh each time it opens, which is what puts it back on its first step.
  return open ? <OpenTour steps={steps} onClose={onClose} startAt={startAt} /> : null;
}

interface OpenTourProps {
  steps: readonly PortalTourStep[];
  onClose: (completed: boolean) => void;
  startAt: number;
}

function OpenTour({ steps, onClose, startAt }: Readonly<OpenTourProps>) {
  // Resolved ONCE, after the first commit: the anchors are usually siblings
  // rendered in the same tree, so looking for them during render — before
  // they are in the DOM — would find none and close the tour at once.
  const [resolved, setResolved] = useState<ResolvedTourStep[] | null>(null);
  const [position, setPosition] = useState(0);
  const current: ResolvedTourStep | undefined = resolved?.[position];
  // What the tour opened with: a step list rebuilt on a parent's render must not restart it.
  const opened = useRef({ steps, startAt });

  useLayoutEffect(() => {
    setResolved(resolveTourSteps(opened.current.steps, opened.current.startAt));
  }, []);

  useEffect(() => {
    if (resolved && !current) onClose(false);
  }, [resolved, current, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!current) return null;
  return (
    <TourStepCard
      // A new key per step remounts the card, which re-measures and re-focuses it.
      key={current.index}
      current={current}
      position={position}
      total={resolved?.length ?? 0}
      onBack={() => setPosition(position - 1)}
      onNext={() => setPosition(position + 1)}
      onClose={onClose}
    />
  );
}

interface TourStepCardProps {
  current: ResolvedTourStep;
  position: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onClose: (completed: boolean) => void;
}

function TourStepCard({ current, position, total, onBack, onNext, onClose }: Readonly<TourStepCardProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const rect = useTourTarget(current.element);
  const isLast = position === total - 1;

  // The step just opened: keyboard and screen-reader users land on its card. The
  // Popper renders inline (no portal), so the card is in the DOM from this
  // component's first commit and the ref is always set here.
  useEffect(() => {
    (cardRef.current as HTMLDivElement).focus();
  }, []);

  return (
    <Box data-testid="portal-tour" sx={{ position: 'fixed', inset: 0, zIndex: 'modal', pointerEvents: 'none' }}>
      <Box
        aria-hidden
        data-testid="portal-tour-spotlight"
        sx={(theme: Theme) => ({
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 1,
          boxShadow: `0 0 0 9999px ${alpha(theme.palette.common.black, SHADE)}`,
          pointerEvents: 'none',
        })}
      />
      <Popper
        open
        anchorEl={current.element}
        placement="bottom"
        disablePortal
        popperOptions={{ strategy: 'fixed' }}
        modifiers={[
          { name: 'offset', options: { offset: [0, 12] } },
          { name: 'preventOverflow', options: { padding: 8 } },
        ]}
        sx={{ zIndex: 'modal', pointerEvents: 'auto' }}
      >
        <Paper
          ref={cardRef}
          role="dialog"
          aria-modal={false}
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          elevation={8}
          sx={{ p: 2, width: 320, maxWidth: (theme: Theme) => `calc(100vw - ${theme.spacing(2)})` }}
        >
          <Typography id={titleId} variant="subtitle1" sx={{ fontWeight: 700 }}>
            {current.step.title}
          </Typography>
          <Typography id={bodyId} variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {current.step.body}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
              {t('ui.guide.stepOf', { vars: { current: position + 1, total } })}
            </Typography>
            <DuncitButton size="small" variant="text" onClick={() => onClose(false)}>
              {t('ui.guide.skip')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" disabled={position === 0} onClick={onBack}>
              {t('ui.guide.back')}
            </DuncitButton>
            {isLast ? (
              <DuncitButton size="small" variant="contained" onClick={() => onClose(true)}>
                {t('ui.guide.done')}
              </DuncitButton>
            ) : (
              <DuncitButton size="small" variant="contained" onClick={onNext}>
                {t('ui.guide.next')}
              </DuncitButton>
            )}
          </Stack>
        </Paper>
      </Popper>
    </Box>
  );
}
