import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { PodKindChooser, type PodKind } from '@duncit/auto-pods';
import { useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { shellAutoPodLabels, shellPodKindLabels } from '@duncit/utils';
import ClubAutoPodForm, { type ClubAutoPodClub } from './ClubAutoPodForm';
import useClubAutoPodEditor from './useClubAutoPodEditor';

interface Props {
  clubId: string;
  club: ClubAutoPodClub | null;
  /** Opens the ordinary pod editor the page already owns. */
  onNormal: () => void;
}

/**
 * The Club Admin's New Pod button — the same question the Admin console asks, so
 * a club that would rather let a venue and a host come to it can open an Auto
 * Pod from where its pods live. With the `auto_pods` flag off there is only one
 * answer, so the ordinary editor opens straight away.
 */
export default function CreatePodLauncher({ clubId, club, onNormal }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoPodsEnabled = useFeatureFlag('auto_pods');
  const [choosing, setChoosing] = useState(false);

  const podKindLabels = useMemo(() => shellPodKindLabels(t), [t]);
  const dismissLabel = useMemo(() => shellAutoPodLabels(t).dismiss, [t]);

  // An Auto Pod is not a pod yet, so it never lands in this club's pods table —
  // the queue that does show it is where the club admin is taken instead.
  const editor = useClubAutoPodEditor({
    clubId,
    onSaved: () => navigate('/club-admin/auto-pods'),
  });

  const start = useCallback(() => {
    if (!autoPodsEnabled) {
      onNormal();
      return;
    }
    setChoosing(true);
  }, [autoPodsEnabled, onNormal]);

  const pick = useCallback(
    (kind: PodKind) => {
      setChoosing(false);
      if (kind === 'AUTO') {
        editor.openCreate();
        return;
      }
      onNormal();
    },
    [editor, onNormal]
  );

  return (
    <>
      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={start}>
        {podKindLabels.newPodCta}
      </Button>

      <PodKindChooser
        open={choosing}
        labels={podKindLabels}
        onClose={() => setChoosing(false)}
        onPick={pick}
      />

      <ClubAutoPodForm
        open={editor.open}
        club={club}
        saving={editor.saving}
        error={editor.error}
        dismissLabel={dismissLabel}
        onClose={editor.close}
        onSubmit={editor.submit}
      />
    </>
  );
}
