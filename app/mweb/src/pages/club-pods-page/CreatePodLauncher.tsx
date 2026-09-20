import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DuncitButton } from '@duncit/buttons';
import { PodKindChooser, type PodKind } from '@duncit/auto-pods';
import { mwebPodKindLabels } from '@duncit/utils';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  clubId: string;
  /** Where the ordinary pod editor lives — `${podsPath}/new`. */
  normalTo: string;
}

/**
 * The Club Admin's New Pod button — the same question the Partners console
 * asks (rule 27), so a club that would rather let a venue and a host come to
 * it can open an Auto Pod from where its pods live. With the `auto_pods` flag
 * off there is only one answer, so the ordinary editor opens straight away.
 */
export default function CreatePodLauncher({ clubId, normalTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoPodsEnabled = useFeatureFlag('auto_pods');
  const [choosing, setChoosing] = useState(false);

  const podKindLabels = useMemo(() => mwebPodKindLabels(t), [t]);

  const start = useCallback(() => {
    if (!autoPodsEnabled) {
      navigate(normalTo);
      return;
    }
    setChoosing(true);
  }, [autoPodsEnabled, navigate, normalTo]);

  // An Auto Pod opens in the same full-page editor an ordinary pod does, in
  // Auto Pod mode — so both kinds of pod are written the same way.
  const pick = useCallback(
    (kind: PodKind) => {
      setChoosing(false);
      navigate(kind === 'AUTO' ? `/clubs/${clubId}/auto-pods/new` : normalTo);
    },
    [clubId, navigate, normalTo]
  );

  return (
    <>
      <DuncitButton
        data-testid="club-pods-page-new"
        onClick={start}
        variant="contained"
        size="small"
        startIcon={<AddRoundedIcon />}
        sx={{ flexShrink: 0 }}
      >
        {podKindLabels.newPodCta}
      </DuncitButton>

      <PodKindChooser
        open={choosing}
        labels={podKindLabels}
        onClose={() => setChoosing(false)}
        onPick={pick}
      />
    </>
  );
}
