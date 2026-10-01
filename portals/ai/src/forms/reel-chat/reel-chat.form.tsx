import { useMemo, useState, type KeyboardEvent } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Stack, Tooltip } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import type { AiPrompt } from '@duncit/ai-prompts';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import MediaPickerDialog from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import SavedPromptsMenu from '../../pages/reels/studio/chat/SavedPromptsMenu';
import { MAX_ATTACHMENTS, REEL_UPLOAD_FOLDER } from '../../pages/reels/types';
import { ReelPromptForm, type ReelPromptFormValues } from '../reel-prompt';
import {
  buildReelChatSchema,
  reelChatInitialValues,
  type ReelChatFormProps,
  type ReelChatFormValues,
} from './reel-chat.types';

/**
 * The chat composer: what to change, the pictures to change it with, and the
 * saved requests.
 *
 * Pictures are uploaded when they are picked, not when the message is sent, so
 * a slow upload is waited for while the operator is still typing — and sending
 * is then one fast call that cannot fail half-way through a file.
 */
export default function ReelChatForm({ busy, savedPrompts, onSend }: Readonly<ReelChatFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelChatSchema(t), [t]);
  const { control, handleSubmit, reset, setValue, setFocus, formState } = useForm<ReelChatFormValues, any, ReelChatFormValues>({
    defaultValues: reelChatInitialValues,
    resolver: zodResolver(schema) as unknown as Resolver<ReelChatFormValues, any, ReelChatFormValues>,
    mode: 'onChange',
  });
  const text = useWatch({ control, name: 'text' });
  const [images, setImages] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const room = MAX_ATTACHMENTS - images.length;

  const submit = handleSubmit(async (values) => {
    // A turn already with the editor is not sent twice, whichever way submit was reached.
    if (busy) return;
    const sent = await onSend(values.text, images);
    if (!sent) return;
    reset(reelChatInitialValues);
    setImages([]);
  });

  // Enter sends, Shift+Enter breaks the line — what every chat box does.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!busy) submit().catch(() => undefined);
  };

  const attach = (urls: string[]) => setImages((held) => [...new Set([...held, ...urls])].slice(0, MAX_ATTACHMENTS));

  const detach = (url: string) => setImages((held) => held.filter((item) => item !== url));

  const fillFromPrompt = (prompt: AiPrompt) => {
    setValue('text', prompt.content, { shouldValidate: true, shouldDirty: true });
    setFocus('text');
  };

  const savePrompt = async (values: ReelPromptFormValues) => {
    if (await savedPrompts.save(values)) setSaveOpen(false);
  };

  return (
    <>
      <form noValidate onSubmit={submit} data-testid="reel-chat-form">
        <Stack spacing={1} sx={{ p: 1.5 }}>
          {images.length > 0 && (
            <Stack direction="row" role="group" aria-label={t('ai.reels.chat.attachments')} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {images.map((url, index) => (
                <Stack
                  key={url}
                  direction="row"
                  sx={{ alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, pl: 0.5 }}
                  data-testid={`reel-chat-attachment-${index + 1}`}
                >
                  <Avatar variant="rounded" src={url} alt="" sx={{ width: 32, height: 32 }} />
                  <DuncitIconButton
                    size="small"
                    aria-label={t('ai.reels.chat.removeAttachment', { vars: { number: index + 1 } })}
                    onClick={() => detach(url)}
                  >
                    <CloseIcon fontSize="small" />
                  </DuncitIconButton>
                </Stack>
              ))}
            </Stack>
          )}
          <RhfTextField
            control={control}
            name="text"
            label={t('ai.reels.chat.composerLabel')}
            placeholder={t('ai.reels.chat.composerPlaceholder')}
            hint={t('ai.reels.chat.composerHint')}
            multiline
            minRows={2}
            maxRows={8}
            size="small"
            onKeyDown={onKeyDown}
            slotProps={{ htmlInput: { 'data-testid': 'reel-chat-text' } }}
          />
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={t('ai.reels.chat.attach')}>
              <span>
                <DuncitIconButton size="small" aria-label={t('ai.reels.chat.attach')} disabled={busy || room <= 0} onClick={() => setPickerOpen(true)} data-testid="reel-chat-attach">
                  <AddPhotoAlternateOutlinedIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <SavedPromptsMenu prompts={savedPrompts.prompts} disabled={busy} onUse={fillFromPrompt} onDelete={savedPrompts.remove} />
            <Tooltip title={t('ai.reels.prompts.saveCurrent')}>
              <span>
                <DuncitIconButton size="small" aria-label={t('ai.reels.prompts.saveCurrent')} disabled={text.trim() === ''} onClick={() => setSaveOpen(true)} data-testid="reel-chat-save-prompt">
                  <BookmarkAddOutlinedIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <DuncitButton
              type="submit"
              variant="contained"
              size="small"
              endIcon={<SendIcon />}
              loading={busy}
              disabled={!formState.isValid}
              sx={{ ml: 'auto' }}
              data-testid="reel-chat-send"
            >
              {t('ai.reels.chat.send')}
            </DuncitButton>
          </Stack>
        </Stack>
      </form>
      {/* Siblings of the form, never children: a dialog is portalled in the DOM
          but still a descendant in React's tree, so a submit inside it would
          bubble up and send the chat message as well. */}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(url) => attach([url])}
        onPickedMany={attach}
        max={Math.max(1, room)}
        accept="image/*"
        orientation="portrait"
        folder={REEL_UPLOAD_FOLDER}
        surface="PORTALS"
        title={t('ai.reels.chat.attachTitle')}
      />
      <ReelPromptForm open={saveOpen} content={text} submitting={savedPrompts.saving} onClose={() => setSaveOpen(false)} onSubmit={savePrompt} />
    </>
  );
}
