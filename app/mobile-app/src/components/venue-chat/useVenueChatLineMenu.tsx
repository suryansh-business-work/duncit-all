import { useState } from 'react';
import { venueChatLineActions } from '@duncit/utils';

import { ChatMessageActionsSheet } from '@/components/chat/ChatMessageActionsSheet';
import { ConfirmSheet } from '@/components/DuncitDialog';
import { VenueChatEditForm } from '@/forms/venue-chat-edit';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
import type { VenueChatLineActions } from '@/hooks/useVenueChatLineActions';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Options {
  meId: string | null | undefined;
  actions: VenueChatLineActions;
  /** React was picked: the thread opens its emoji bar for that line. */
  onReact: (lineId: string) => void;
}

/**
 * A venue line's long-press menu and what it opens: React for any line, Edit
 * for one's own text (a dialog with its words) and Delete for one's own text
 * or photo (confirmed) — `venueChatLineActions` decides, the server is the
 * gate. A refused edit or delete keeps its dialog open with the reason.
 * `open(line)` shows the menu; `sheets` is drawn once by the screen.
 */
export function useVenueChatLineMenu({ meId, actions, onReact }: Options) {
  const { t } = useTranslation();
  const [line, setLine] = useState<VenueChatMessage | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setEditing(null);
    setRemoving(null);
    setError(null);
  };
  const run = async (request: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const refused = await request();
    setBusy(false);
    if (refused) setError(refused);
    else close();
  };
  const deleteLabel = t('availability.offers.chat.delete');

  const sheets = (
    <>
      <ChatMessageActionsSheet
        target={
          line
            ? {
                id: line.id,
                mine: line.user_id === meId,
                allowed: venueChatLineActions(line, meId),
              }
            : null
        }
        canModerate={false}
        onClose={() => setLine(null)}
        onReact={onReact}
        onEdit={(id) => setEditing({ id, text: line?.text ?? '' })}
        onDelete={setRemoving}
      />
      {editing ? (
        <VenueChatEditForm
          text={editing.text}
          busy={busy}
          error={error}
          onClose={close}
          onSave={(text) => fireAndForget(run(() => actions.edit(editing.id, text)))}
        />
      ) : null}
      <ConfirmSheet
        open={!!removing}
        busy={busy}
        testIDPrefix="venue-chat-delete"
        title={t('availability.offers.chat.deleteTitle')}
        message={t('availability.offers.chat.deleteMessage')}
        cancelLabel={t('availability.offers.cancel')}
        confirmLabel={deleteLabel}
        busyLabel={deleteLabel}
        error={error}
        onCancel={close}
        onConfirm={() => {
          if (removing) fireAndForget(run(() => actions.remove(removing)));
        }}
      />
    </>
  );

  return { open: setLine, sheets };
}
