import type { CmsSiteRow } from '../queries/sites';
import { CMS_COLLECTIONS, COLLECTION_SLUG } from '../lib/labels';
import PagesTab from '../pages-tab/PagesTab';
import FragmentsTab from '../fragments-tab/FragmentsTab';
import CollectionTab from '../collection-tab/CollectionTab';
import DesignTab from '../design-tab/DesignTab';
import CodeTab from '../code-tab/CodeTab';
import SettingsTab from '../settings-tab/SettingsTab';

interface Props {
  tab: string;
  site: CmsSiteRow;
  onSiteChanged: () => void;
}

const collectionOf = (tab: string) => CMS_COLLECTIONS.find((collection) => COLLECTION_SLUG[collection] === tab) ?? null;

/** The body of the selected workspace tab. */
export default function WorkspaceTab({ tab, site, onSiteChanged }: Readonly<Props>) {
  const collection = collectionOf(tab);
  if (collection) return <CollectionTab key={collection} site={site} collection={collection} />;
  switch (tab) {
    case 'fragments':
      return <FragmentsTab site={site} />;
    case 'design':
      return <DesignTab siteId={site.id} />;
    case 'code':
      return <CodeTab siteId={site.id} />;
    case 'settings':
      return <SettingsTab site={site} onSaved={onSiteChanged} />;
    default:
      return <PagesTab site={site} />;
  }
}
