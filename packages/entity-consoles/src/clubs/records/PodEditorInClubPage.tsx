import { useParams } from 'react-router';
import { useTranslation } from '@duncit/shell';
import PodEditorPage from '../../pods/list/pod-editor-page';

/**
 * `/pods/:id/edit` in the clubs console — the pods console's own editor,
 * opened from the pod's page and returning to it on Back, Cancel and Save.
 */
export default function PodEditorInClubPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  return <PodEditorPage backTo={`/pods/${id}`} backLabel={t('directory.clubs.backToPod')} />;
}
