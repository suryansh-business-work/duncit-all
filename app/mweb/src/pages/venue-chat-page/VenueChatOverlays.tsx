import { VenueChatLineDialogs } from '@duncit/availability-calendar';
import EmojiPopover from '../chat-room-page/EmojiPopover';
import MessageActionsMenu from '../chat-room-page/MessageActionsMenu';
import type { useVenueChatInteractions } from './useVenueChatInteractions';

/**
 * What opens over a venue thread from one of its lines: the message menu
 * (react, edit, delete — nothing is reported or replied to here), the reaction
 * picker, and the edit and delete dialogs (a refusal shows inside the one open).
 */
export default function VenueChatOverlays({
  ui,
  error,
}: Readonly<{ ui: ReturnType<typeof useVenueChatInteractions>; error: string | null }>) {
  const reactTo = ui.reactTarget;
  return (
    <>
      <MessageActionsMenu
        target={ui.menu}
        canModerate={false}
        onClose={ui.closeMenu}
        onReact={ui.openReact}
        onEdit={ui.edit}
        onDelete={ui.remove}
      />
      <EmojiPopover
        anchorEl={reactTo?.el ?? null}
        onClose={ui.closeReact}
        onSelect={(emoji) => {
          if (reactTo) ui.react(reactTo.id, emoji);
          ui.closeReact();
        }}
        fontSize={22}
      />
      <VenueChatLineDialogs editing={ui.editing} deletingId={ui.deletingId} actions={ui.actions} error={error} onClose={ui.closeDialogs} />
    </>
  );
}
