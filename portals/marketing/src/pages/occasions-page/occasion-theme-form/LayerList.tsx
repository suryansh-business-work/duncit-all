import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';

interface LayerCardProps {
  title: string;
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}

/** One entry of a repeatable part of a look, with its remove button. */
function LayerCard({ title, removeLabel, onRemove, children }: Readonly<LayerCardProps>) {
  return (
    <Box component="section" aria-label={title} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" component="h4">
          {title}
        </Typography>
        <Tooltip title={removeLabel}>
          <DuncitIconButton size="small" aria-label={removeLabel} onClick={onRemove}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
      {children}
    </Box>
  );
}

export interface LayerListProps {
  title: string;
  subtitle: string;
  addLabel: string;
  /** What the section says while it has none. */
  noneText: string;
  /** The most the server keeps; the add button turns off there. */
  max: number;
  /** `useFieldArray`'s stable ids, one per entry. */
  ids: readonly string[];
  /** Entry headings and remove labels, given the entry's 1-based number. */
  itemTitle: (n: number) => string;
  removeLabel: (n: number) => string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (index: number) => ReactNode;
}

/**
 * A repeatable part of a look — particle layers, flyers, washes — as a titled
 * section: an add button, then each entry in its own card.
 */
export default function LayerList({ title, subtitle, addLabel, noneText, max, ids, itemTitle, removeLabel, onAdd, onRemove, renderItem }: Readonly<LayerListProps>) {
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      action={
        <DuncitButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={ids.length >= max} onClick={onAdd}>
          {addLabel}
        </DuncitButton>
      }
    >
      {ids.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
          {noneText}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {ids.map((id, index) => (
            <LayerCard key={id} title={itemTitle(index + 1)} removeLabel={removeLabel(index + 1)} onRemove={() => onRemove(index)}>
              {renderItem(index)}
            </LayerCard>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
