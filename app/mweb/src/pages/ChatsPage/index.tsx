import { useMemo } from 'react';
import { Stack } from '@mui/material';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import SupportShell from '../support-hub/SupportShell';
import PodChatsPanel from './PodChatsPanel';
import ClubChatsPanel from './ClubChatsPanel';

type ChatsTab = 'PODS' | 'CLUBS';

interface ChatsPageProps {
  superCategorySlug?: string;
}

/**
 * Chats: a Pods tab (each pod's room, closed once the pod ends and deleted
 * some hours later) and a Clubs tab (each joined club's room, which never
 * closes and drops messages past an age). The tab lives in the URL, so Back
 * from a club room lands on Clubs.
 */
export default function ChatsPage({ superCategorySlug }: Readonly<ChatsPageProps>) {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<ChatsTab>[]>(
    () => [
      { value: 'PODS', label: t('mweb.chat.tabPods') },
      { value: 'CLUBS', label: t('mweb.chat.tabClubs') },
    ],
    [t]
  );
  const tabs = useTabParam<ChatsTab>({ items, fallback: 'PODS', param: 'selectedtab_chats' });

  return (
    <SupportShell title={t('mweb.nav.chats')}>
      <Stack spacing={2} data-testid="chats-screen">
        <DuncitTabs {...tabs} variant="fullWidth" />
        {tabs.value === 'PODS' ? (
          <PodChatsPanel superCategorySlug={superCategorySlug} />
        ) : (
          <ClubChatsPanel superCategorySlug={superCategorySlug} />
        )}
      </Stack>
    </SupportShell>
  );
}
