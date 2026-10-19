import { useEffect, useMemo, useState } from 'react';
import { parseStoredQuickAccess, type ProfileMenuFlags, type ProfileMenuKey } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';
import { useQuickAccessStore } from '@/stores/quick-access.store';
import { menuEntry } from './profileSections';
import { SidebarQuickAccessEditor } from './SidebarQuickAccessEditor';
import { SidebarQuickGrid } from './SidebarQuickGrid';

/**
 * The Quick Access block: the member's six tiles (kept on the device, read
 * back against the live flags) and the sheet that edits them. RN twin of
 * mWeb's <QuickAccess/>.
 */
export function SidebarQuickAccess({
  flags,
  badgeCounts,
  onNavigate,
}: Readonly<{
  flags: ProfileMenuFlags;
  badgeCounts?: Readonly<Partial<Record<ProfileMenuKey, number>>>;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const { t } = useTranslation();
  const raw = useQuickAccessStore((s) => s.raw);
  const hydrate = useQuickAccessStore((s) => s.hydrate);
  const save = useQuickAccessStore((s) => s.save);
  const [editing, setEditing] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);

  const selection = useMemo(() => parseStoredQuickAccess(raw, flags), [raw, flags]);
  const tiles = selection.map((key) => menuEntry(key, t));

  const onSave = async (next: ProfileMenuKey[]) => {
    const kept = await save(next);
    setSaveFailed(!kept);
    // A pick the device would not keep stays on screen with the reason; a kept one closes.
    if (kept) setEditing(false);
  };

  return (
    <>
      <SidebarQuickGrid
        tiles={tiles}
        badgeCounts={badgeCounts}
        onEdit={() => {
          setSaveFailed(false);
          setEditing(true);
        }}
        onNavigate={onNavigate}
      />
      <SidebarQuickAccessEditor
        open={editing}
        current={selection}
        flags={flags}
        saveFailed={saveFailed}
        onClose={() => setEditing(false)}
        onSave={(next) => {
          onSave(next).catch(() => setSaveFailed(true));
        }}
      />
    </>
  );
}
