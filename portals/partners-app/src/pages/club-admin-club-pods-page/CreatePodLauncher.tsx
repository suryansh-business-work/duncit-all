import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PodKindChooser, type PodKind } from '@duncit/auto-pods';
import { useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { shellPodKindLabels } from '@duncit/utils';

interface Props {
  clubId: string;
  /** Opens the ordinary pod editor the page already owns. */
  onNormal: () => void;
}

/**
 * The Club Admin's New Pod button — the same question the Admin console asks, so
 * a club that would rather let a venue and a host come to it can open an Auto
 * Pod from where its pods live. With the `auto_pods` flag off there is only one
 * answer, so the ordinary editor opens straight away.
 */
export default function CreatePodLauncher({ clubId, onNormal }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoPodsEnabled = useFeatureFlag('auto_pods');
  const [choosing, setChoosing] = useState(false);

  const podKindLabels = useMemo(() => shellPodKindLabels(t), [t]);

  const start = useCallback(() => {
    if (!autoPodsEnabled) {
      onNormal();
      return;
    }
    setChoosing(true);
  }, [autoPodsEnabled, onNormal]);

  // An Auto Pod opens in the same full-page editor an ordinary pod does, in
  // Auto Pod mode — so both kinds of pod are written the same way.
  const pick = useCallback(
    (kind: PodKind) => {
      setChoosing(false);
      if (kind === 'AUTO') {
        navigate(`/club-admin/clubs/${clubId}/auto-pods/new`);
        return;
      }
      onNormal();
    },
    [clubId, navigate, onNormal]
  );

  return (
    <>
      <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={start}>
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
