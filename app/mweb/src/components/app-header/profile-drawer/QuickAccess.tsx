import { useState } from 'react';
import type { ProfileMenuFlags, ProfileMenuKey } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import QuickActionGrid from './QuickActionGrid';
import { QuickAccessForm } from './quick-access-form';
import { menuEntry } from './profileSections';
import { useQuickAccess } from './useQuickAccess';

interface Props {
  flags: ProfileMenuFlags;
  badgeCounts?: Readonly<Partial<Record<ProfileMenuKey, number>>>;
  onNavigate: (to: string) => void;
}

/** The Quick Access block: the member's six tiles (kept in this browser, read
 * back against the live flags) and the dialog that edits them. Native twin:
 * Sidebar/SidebarQuickAccess. */
export default function QuickAccess({ flags, badgeCounts, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const { selection, save } = useQuickAccess(flags);
  const [editing, setEditing] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  return (
    <>
      <QuickActionGrid
        tiles={selection.map((key) => menuEntry(key, t))}
        badgeCounts={badgeCounts}
        onEdit={() => {
          setSaveFailed(false);
          setEditing(true);
        }}
        onNavigate={onNavigate}
      />
      <QuickAccessForm
        open={editing}
        current={selection}
        flags={flags}
        saveFailed={saveFailed}
        onClose={() => setEditing(false)}
        onSave={(next) => {
          const kept = save(next);
          setSaveFailed(!kept);
          // A pick the browser would not keep stays on screen with the reason.
          if (kept) setEditing(false);
        }}
      />
    </>
  );
}
