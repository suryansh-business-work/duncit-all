import type { ReactElement } from 'react';
import AccessSection from './access';
import AuditSection from './audit';
import ConnectorsSection from './connectors';
import EmbeddingsSection from './embeddings';
import GeneralSection from './general';
import HealthSection from './health';
import MediaSection from './media';
import ModelsSection from './models';
import OpenAiSection from './openai';
import QdrantSection from './qdrant';
import { CONNECTOR_SECTION_KIND, type SettingsSection } from './sections';
import SecuritySection from './security';
import SyncSection from './sync';
import UsageSection from './usage';

const SECTIONS: Partial<Record<SettingsSection, () => ReactElement>> = {
  general: () => <GeneralSection />,
  models: () => <ModelsSection />,
  openai: () => <OpenAiSection />,
  qdrant: () => <QdrantSection />,
  embeddings: () => <EmbeddingsSection />,
  media: () => <MediaSection />,
  sync: () => <SyncSection />,
  access: () => <AccessSection />,
  security: () => <SecuritySection />,
  usage: () => <UsageSection />,
  audit: () => <AuditSection />,
  health: () => <HealthSection />,
};

/** The open section: one of the five connector managers, or its own page. */
export default function SectionContent({ section }: Readonly<{ section: SettingsSection }>) {
  const kind = CONNECTOR_SECTION_KIND[section];
  if (kind) return <ConnectorsSection key={kind} kind={kind} />;
  return SECTIONS[section]?.() ?? null;
}
