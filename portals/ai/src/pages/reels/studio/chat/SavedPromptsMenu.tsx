import { useId, useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Popover, Tooltip, Typography } from '@mui/material';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { AiPrompt } from '@duncit/ai-prompts';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  prompts: readonly AiPrompt[];
  disabled?: boolean;
  /** Put this prompt's words into the composer. */
  onUse: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => Promise<void>;
}

const TEXT_SLOTS = { primary: { noWrap: true, variant: 'body2' }, secondary: { noWrap: true, variant: 'caption' } } as const;

/**
 * The saved requests, one press away from the composer.
 *
 * A popover holding a list rather than a menu: each row has two actions — use
 * it, delete it — and a menu item may not contain a second control. Choosing a
 * prompt only fills the composer; nothing is sent until the operator sends it,
 * so a saved request can be adjusted for this reel first.
 */
export default function SavedPromptsMenu({ prompts, disabled, onUse, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const choose = (prompt: AiPrompt) => {
    onUse(prompt);
    close();
  };

  return (
    <>
      <Tooltip title={t('ai.reels.prompts.open')}>
        <span>
          <DuncitIconButton
            size="small"
            aria-label={t('ai.reels.prompts.open')}
            aria-haspopup="dialog"
            aria-expanded={anchor !== null}
            disabled={disabled}
            onClick={(event) => setAnchor(event.currentTarget)}
            data-testid="reel-prompts-open"
          >
            <BookmarksOutlinedIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId, sx: { width: 340, maxHeight: 380 } } }}
      >
        <Typography id={titleId} variant="subtitle2" component="h3" sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 700 }}>
          {t('ai.reels.prompts.title')}
        </Typography>
        {prompts.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, pb: 2 }} data-testid="reel-prompts-empty">
            {t('ai.reels.prompts.empty')}
          </Typography>
        ) : (
          <List dense disablePadding sx={{ pb: 1 }} data-testid="reel-prompts-list">
            {prompts.map((prompt) => {
              const deleteLabel = t('ai.reels.prompts.deleteNamed', { vars: { name: prompt.name } });
              return (
                <ListItem
                  key={prompt.id}
                  disablePadding
                  secondaryAction={
                    <DuncitIconButton edge="end" size="small" aria-label={deleteLabel} onClick={() => onDelete(prompt)} data-testid={`reel-prompt-delete-${prompt.id}`}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </DuncitIconButton>
                  }
                >
                  <ListItemButton onClick={() => choose(prompt)} sx={{ pr: 6 }} data-testid={`reel-prompt-use-${prompt.id}`}>
                    <ListItemText primary={prompt.name} secondary={prompt.content} slotProps={TEXT_SLOTS} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Popover>
    </>
  );
}
