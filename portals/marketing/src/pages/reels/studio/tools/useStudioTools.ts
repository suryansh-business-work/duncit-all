import { useCallback, useState } from 'react';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { variantPostText } from '../../../../forms/reel-variants';
import type { ReelCheck, ReelProject, ReelVariant } from '../../types';

export type ToolDialog = 'validate' | 'variants' | 'history' | 'analytics';

/**
 * Which of the toolbar's tools is open, and what they leave behind: the
 * latest check result (for the toolbar's chip) and the caption chosen for
 * the post (for the composer, when the reel is exported and posted).
 */
export function useStudioTools(project: ReelProject) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<ToolDialog | null>(null);
  const [checks, setChecks] = useState<ReelCheck[] | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  const open = useCallback((kind: ToolDialog) => setDialog(kind), []);
  const close = useCallback(() => setDialog(null), []);

  /** The chosen network's caption becomes what the post opens with. */
  const useVariant = useCallback(
    (variant: ReelVariant) => {
      setCaption(variantPostText(variant));
      notifySuccess(t('ai.reels.variants.used'));
    },
    [t]
  );

  return {
    dialog,
    open,
    close,
    /** A fresh run's result, else what the server last kept on the reel. */
    checks: checks ?? project.checks,
    setChecks,
    /** What the post opens with: the chosen caption, else the reel's name. */
    caption: caption ?? project.name,
    useVariant,
  };
}

export type StudioTools = ReturnType<typeof useStudioTools>;
