import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  AI_TRANSLATION_PENDING,
  BACKGROUND_JOBS_QUERY,
  START_AI_TRANSLATION,
  type LocaleRow,
} from '../../lib/queries';
import LanguageChecklist from './LanguageChecklist';
import ScopeChoice from './ScopeChoice';
import {
  aiTranslateSchema,
  type AiTranslateNamespace,
  type AiTranslateValues,
  type PendingRow,
} from './ai-translate.types';

type Translate = ReturnType<typeof useTranslation>['t'];

const NONE: readonly string[] = [];

/** The line under the choices: what pressing Start will actually send. */
function summaryText(t: Translate, total: number): string {
  if (total === 0) return t('localization.ai.nothingToSend');
  return t('localization.ai.willSend', { count: total });
}

export interface AiTranslateDialogProps {
  /** Languages that can be translated into — every locale except the default one. */
  targets: readonly LocaleRow[];
  /** Ticked when the dialog opens. Empty ticks every target. */
  preselect?: readonly string[];
  /** Limit the run to one page of keys; null covers the whole catalogue. */
  namespace?: AiTranslateNamespace | null;
  onClose: () => void;
}

/**
 * Sync languages with English through OpenAI. Mounted only while open, so
 * every opening starts from its own defaults.
 *
 * Starting it creates one background job per language ON THE SERVER, so this
 * dialog closes as soon as they exist: the header's progress ring follows them
 * across refreshes, page changes and consoles, and stops or dismisses them.
 */
export function AiTranslateDialog({
  targets,
  preselect = NONE,
  namespace = null,
  onClose,
}: Readonly<AiTranslateDialogProps>) {
  const { t } = useTranslation();
  const [opError, setOpError] = useState<string | null>(null);
  const schema = useMemo(() => aiTranslateSchema(t), [t]);
  const allCodes = useMemo(() => targets.map((locale) => locale.code), [targets]);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AiTranslateValues>({
    resolver: zodResolver(schema),
    defaultValues: { locales: preselect.length > 0 ? [...preselect] : allCodes, scope: 'OUTDATED' },
  });

  const scope = watch('scope');
  const picked = watch('locales');
  const where = { surface: namespace?.surface, page: namespace?.page };
  const pendingQuery = useQuery<{ aiTranslationPending: PendingRow[] }>(AI_TRANSLATION_PENDING, {
    variables: { input: { locales: allCodes, scope, ...where } },
    skip: allCodes.length === 0,
    fetchPolicy: 'network-only',
  });
  const pending = useMemo(
    () => new Map((pendingQuery.data?.aiTranslationPending ?? []).map((row) => [row.locale, row.keys])),
    [pendingQuery.data],
  );
  const counted = pendingQuery.data !== undefined && !pendingQuery.loading;
  const total = picked.reduce((sum, code) => sum + (pending.get(code) ?? 0), 0);

  const [start] = useMutation<{ startAiTranslation: { id: string }[] }>(START_AI_TRANSLATION, {
    refetchQueries: [BACKGROUND_JOBS_QUERY],
  });

  const submit = async (values: AiTranslateValues) => {
    setOpError(null);
    try {
      const res = await start({
        variables: { input: { ...values, ...where }, url: window.location.href },
      });
      // Languages with nothing to send get no job, so count what actually started.
      notifySuccess(t('localization.ai.started', { count: res.data?.startAiTranslation.length ?? 0 }));
      onClose();
    } catch (e) {
      // A rejected mutation is always an Error — Apollo wraps anything else.
      setOpError((e as Error).message);
    }
  };

  const title = namespace
    ? t('localization.ai.titlePage', { vars: { namespace: `${namespace.surface}.${namespace.page}` } })
    : t('localization.ai.title');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="ai-translate-title">
      <DialogTitle id="ai-translate-title">{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('localization.ai.intro')}
          </Typography>
          {targets.length === 0 && <Alert severity="info">{t('localization.ai.noTargets')}</Alert>}
          {pendingQuery.error && <Alert severity="error">{pendingQuery.error.message}</Alert>}
          {opError && <Alert severity="error">{opError}</Alert>}
          <Controller
            control={control}
            name="scope"
            render={({ field }) => <ScopeChoice value={field.value} onChange={field.onChange} />}
          />
          {targets.length > 0 && (
            <Controller
              control={control}
              name="locales"
              render={({ field }) => (
                <LanguageChecklist
                  targets={targets}
                  value={field.value}
                  onChange={field.onChange}
                  pending={pending}
                  error={errors.locales?.message}
                />
              )}
            />
          )}
          {counted && (
            <Typography variant="body2" sx={{ fontWeight: 600 }} role="status">
              {summaryText(t, total)}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('localization.ai.backgroundHint')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          disabled={isSubmitting || !counted || total === 0}
          onClick={handleSubmit(submit)}
          data-testid="ai-translate-start"
        >
          {isSubmitting ? t('localization.ai.starting') : t('localization.ai.start')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
