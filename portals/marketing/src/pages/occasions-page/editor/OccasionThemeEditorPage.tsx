import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box } from '@mui/material';
import type { MutationSaveOccasionThemeArgs } from '@duncit/gql-types';
import { notify, useConfirm } from '@duncit/dialogs';
import { TAB_PARAM } from '@duncit/tabs';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  OCCASION_REFRESH,
  OCCASION_THEME,
  SAVE_OCCASION_THEME,
  type OccasionThemeData,
  type SaveOccasionThemeData,
} from '../queries';
import { useSetLiveMode } from '../live/useSetLiveMode';
import { OccasionThemeForm, toThemeInput, type OccasionThemeFormValues } from '../occasion-theme-form';

const GALLERY = `/occasions?${TAB_PARAM}=themes`;
const LIVE = `/occasions?${TAB_PARAM}=live`;

/**
 * `/occasions/themes/new` designs a look; `/occasions/themes/:key` edits one.
 * "Save & apply now" asks first — it changes every member's app — then saves
 * and pins the look live.
 */
export default function OccasionThemeEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { key } = useParams<{ key: string }>();
  const isNew = !key;
  const { data, loading, error } = useQuery<OccasionThemeData>(OCCASION_THEME, {
    variables: { key: key ?? '' },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const [saveMut] = useMutation<SaveOccasionThemeData, MutationSaveOccasionThemeArgs>(SAVE_OCCASION_THEME, {
    refetchQueries: OCCASION_REFRESH,
    awaitRefetchQueries: true,
  });
  const { confirmLive, applyLive } = useSetLiveMode();
  const [serverError, setServerError] = useState<string | null>(null);
  const theme = data?.occasionTheme ?? null;

  const save = async (values: OccasionThemeFormValues, apply: boolean) => {
    setServerError(null);
    if (apply && !(await confirmLive('MANUAL', { key: key ?? '', name: values.name }))) return;
    try {
      const result = await saveMut({ variables: { key: key ?? null, input: toThemeInput(values) } });
      const saved = result.data?.saveOccasionTheme;
      notify(t('marketing.occasions.editor.saved', { vars: { name: values.name.trim() } }), 'success');
      // A failed switch has said why; the look itself is saved, so the gallery is where to go next.
      const applied = apply && saved ? await applyLive('MANUAL', saved) : false;
      navigate(applied ? LIVE : GALLERY);
    } catch (err) {
      const message = parseApiError(err);
      setServerError(message);
      notify(message, 'error');
    }
  };

  const cancel = async (dirty: boolean) => {
    const leave =
      !dirty ||
      (await confirm({
        title: t('marketing.occasions.editor.discardTitle'),
        message: t('marketing.occasions.editor.discardMessage'),
        confirmLabel: t('marketing.occasions.editor.discard'),
        destructive: true,
      }));
    if (leave) navigate(GALLERY);
  };

  const title = isNew ? t('marketing.occasions.editor.newTitle') : (theme?.name ?? t('marketing.occasions.editor.editTitle'));

  return (
    <Box sx={{ p: 2 }} data-testid="occasion-theme-editor">
      <BackHeader
        backTo={GALLERY}
        backAriaLabel={t('marketing.occasions.editor.back')}
        eyebrow={t('marketing.occasions.editor.eyebrow')}
        title={title}
        sx={{ mb: 2.5 }}
      />
      <QueryGuard
        loading={!isNew && loading && !theme}
        error={error}
        notFound={!isNew && !loading && !error && !theme}
        notFoundText={t('marketing.occasions.editor.notFound')}
      >
        {() => <OccasionThemeForm key={theme?.key ?? 'new'} theme={theme} onSubmit={save} onCancel={cancel} serverError={serverError} />}
      </QueryGuard>
    </Box>
  );
}
