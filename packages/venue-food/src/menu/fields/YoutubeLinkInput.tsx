import { useMemo, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { makeYoutubeLinkSchema, youtubeLinkDefaults, type YoutubeLinkValues } from '@duncit/forms/schemas';

interface Props {
  onAdd: (url: string) => void;
  disabled?: boolean;
  /** Roots the field's test ids. */
  testId: string;
}

/**
 * The "paste a YouTube link" row beside a video upload. A small form of its
 * own (no `<form>` element — it sits inside the venue or menu form, so Enter
 * adds the link instead of submitting the page). The rule is @duncit/forms'
 * `makeYoutubeLinkSchema` (@duncit/regex `YOUTUBE_URL`).
 */
export default function YoutubeLinkInput({ onAdd, disabled, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeYoutubeLinkSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<YoutubeLinkValues>({
    resolver: zodResolver(schema),
    defaultValues: youtubeLinkDefaults,
  });

  const add = handleSubmit((values) => {
    onAdd(values.url.trim());
    reset(youtubeLinkDefaults);
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    // handleSubmit only rejects if the synchronous onAdd throws, and validation errors render on the field.
    add().catch(() => undefined);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <RhfTextField
        control={control}
        name="url"
        label={t('venueFoodOwner.videos.youtube')}
        hint={t('venueFoodOwner.videos.youtubeHint')}
        size="small"
        type="url"
        disabled={disabled}
        onKeyDown={onKeyDown}
        slotProps={{ htmlInput: { inputMode: 'url', 'data-testid': `${testId}-youtube` } }}
      />
      <DuncitButton
        size="small"
        startIcon={<AddLinkIcon />}
        disabled={disabled}
        onClick={add}
        sx={{ flex: '0 0 auto', mt: 0.5 }}
        data-testid={`${testId}-youtube-add`}
      >
        {t('venueFoodOwner.videos.add')}
      </DuncitButton>
    </Stack>
  );
}
