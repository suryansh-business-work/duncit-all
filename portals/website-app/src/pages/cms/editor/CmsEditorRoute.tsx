import { useParams } from 'react-router';
import CmsEditorPage from './CmsEditorPage';

/**
 * One editor per document: opening a component from a page (or any other
 * document) is a fresh editor, so its canvas, unsaved flag and save lock
 * (`base_updated_at`) are never the previous document's.
 */
export default function CmsEditorRoute() {
  const { target = '', docId = '' } = useParams();
  return <CmsEditorPage key={`${target}:${docId}`} />;
}
