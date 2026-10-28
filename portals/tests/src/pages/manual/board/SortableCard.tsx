import { memo, type KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Card } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ManualCard } from '../shared/types';
import { CaseCardFace } from './CaseCardFace';

interface Props {
  card: ManualCard;
  onOpen: (key: string) => void;
}

/**
 * A card that can be dragged — by pointer, or from the keyboard with Space
 * (pick up), the arrow keys (move) and Space again (drop). Enter and a click
 * open the case instead.
 */
export const SortableCard = memo(function SortableCard({ card, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault();
      onOpen(card.key);
      return;
    }
    listeners?.onKeyDown?.(event);
  };

  return (
    <Box
      component="li"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{ opacity: isDragging ? 0.4 : 1 }}
    >
      {/* role and tabIndex repeat dnd-kit's own values (the card is never disabled);
          spelled out so the a11y lint sees a focusable button, not a clickable div. */}
      <Card
        variant="outlined"
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onClick={() => onOpen(card.key)}
        aria-label={t('testsManual.board.cardLabel', { vars: { key: card.key, title: card.title } })}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab', '&:hover': { borderColor: 'primary.main' } }}
      >
        <CaseCardFace card={card} />
      </Card>
    </Box>
  );
});
