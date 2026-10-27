import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { InputAdornment, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent } from '../../../../../shared/graphql/documents';
import { SITE_URL } from '../../../../../shared/env';
import { useWebT } from '../../../../../shared/i18n';
import { LITE_CHANGE_EVENT_SLUG } from '../../../../graphql/events';
import { paths } from '../../../../lib/paths';
import { makeEventLinkSchema, type EventLinkValues } from './event-link.types';

/** Choose a new /e/<link> for the event. The old link stops working, so it asks first. */
export function EventLinkForm({ event }: Readonly<{ event: Pick<LiteEvent, 'id' | 'slug'> }>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const schema = useMemo(() => makeEventLinkSchema(t), [t]);
  const [changeSlug] = useMutation(LITE_CHANGE_EVENT_SLUG);
  const { control, handleSubmit, formState } = useForm<EventLinkValues>({ resolver: zodResolver(schema), defaultValues: { slug: event.slug } });

  const submit = handleSubmit(async ({ slug }) => {
    if (slug === event.slug) return;
    const ok = await confirm({ title: t('liteWeb.manage.link.confirmTitle'), message: t('liteWeb.manage.link.confirmBody'), confirmLabel: t('liteWeb.manage.link.update') });
    if (!ok) return;
    try {
      const { data } = await changeSlug({ variables: { id: event.id, slug } });
      notifySuccess(t('liteWeb.manage.link.updated'));
      navigate(paths.eventManage(data?.liteChangeEventSlug.slug ?? slug, 'more'), { replace: true });
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} onSubmit={submit} noValidate sx={{ alignItems: { sm: 'flex-start' } }} data-testid="event-link-form">
      <RhfTextField
        control={control}
        name="slug"
        label={t('liteWeb.manage.link.label')}
        hint={t('liteWeb.manage.link.hint')}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">{`${new URL(SITE_URL).host}/e/`}</InputAdornment> },
          htmlInput: { maxLength: 80, autoCapitalize: 'none', 'data-testid': 'event-link-slug' },
        }}
      />
      <DuncitButton type="submit" variant="outlined" loading={formState.isSubmitting} sx={{ flexShrink: 0, mt: { sm: 1 } }} data-testid="event-link-save">
        {t('liteWeb.manage.link.update')}
      </DuncitButton>
    </Stack>
  );
}
