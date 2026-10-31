import type { DocumentNode } from 'graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import type { BannerKitValues } from '@duncit/forms/schemas';
import { QueryGuard, SectionCard } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';
import { BannerKitForm, type BannerKitData, type BannerKitEntity } from './banner-kit-form';
import {
  CONSOLE_HOST_BANNER_KIT,
  CONSOLE_VENUE_BANNER_KIT,
  OWNER_HOST_BANNER_KIT,
  OWNER_VENUE_BANNER_KIT,
  UPDATE_HOST_BANNER_KIT,
  UPDATE_VENUE_BANNER_KIT,
} from './queries';

/** Who is looking: the partner at their own venue or host profile, or staff at the record. */
export type BannerKitMode = 'owner' | 'console';

export interface BannerKitPanelProps {
  entity: BannerKitEntity;
  mode: BannerKitMode;
  /** The venue's id; for a host, the host's id in the console (an owner host reads their own). */
  id?: string;
}

interface KitRecord {
  id: string;
  /** The venue's or the host's name (aliased in each query). */
  name: string;
  banner_kit: BannerKitData;
}

interface Read {
  document: DocumentNode;
  /** The query's root field. */
  field: string;
  variables: (id: string) => Record<string, string>;
}

const venueVars = (id: string) => ({ venue_id: id });
const hostVars = (id: string) => ({ host_id: id });

const READS: Readonly<Record<BannerKitEntity, Record<BannerKitMode, Read>>> = {
  VENUE: {
    owner: { document: OWNER_VENUE_BANNER_KIT, field: 'myVenue', variables: venueVars },
    console: { document: CONSOLE_VENUE_BANNER_KIT, field: 'venue', variables: venueVars },
  },
  HOST: {
    owner: { document: OWNER_HOST_BANNER_KIT, field: 'myHost', variables: () => ({}) },
    console: { document: CONSOLE_HOST_BANNER_KIT, field: 'host', variables: hostVars },
  },
};

const SAVES: Readonly<Record<BannerKitEntity, { document: DocumentNode; variables: (id: string) => Record<string, string> }>> = {
  VENUE: { document: UPDATE_VENUE_BANNER_KIT, variables: venueVars },
  HOST: { document: UPDATE_HOST_BANNER_KIT, variables: hostVars },
};

/**
 * A venue's or a host's banner kit, read and saved where its viewer may: the
 * partner's own venue or host profile in the Partners console, or the record
 * in the Venues, Hosts and Onboarding consoles. The server decides who may
 * save (the owner, or a console editor), never this panel.
 */
export function BannerKitPanel({ entity, mode, id = '' }: Readonly<BannerKitPanelProps>) {
  const { t } = useTranslation();
  const read = READS[entity][mode];
  const save = SAVES[entity];
  const needsId = !(entity === 'HOST' && mode === 'owner');
  const { data, loading, error } = useQuery<Record<string, KitRecord | null>>(read.document, {
    variables: read.variables(id),
    fetchPolicy: 'cache-and-network',
    skip: needsId && !id,
  });
  const [saveKit] = useMutation(save.document);
  const record = data?.[read.field] ?? null;

  const onSave = async (recordId: string, input: BannerKitValues) => {
    await saveKit({ variables: { ...save.variables(recordId), input } });
    notifySuccess(t('shell.bannerKit.saved'));
  };

  return (
    <SectionCard title={t('shell.bannerKit.title')} subtitle={t('shell.bannerKit.subtitle')}>
      <QueryGuard loading={loading && !record} error={error} errorText={error?.message} notFound={!record} notFoundSeverity="warning">
        {record ? (
          <BannerKitForm
            entity={entity}
            entityId={record.id}
            name={record.name}
            kit={record.banner_kit}
            onSave={(input) => onSave(record.id, input)}
          />
        ) : null}
      </QueryGuard>
    </SectionCard>
  );
}
