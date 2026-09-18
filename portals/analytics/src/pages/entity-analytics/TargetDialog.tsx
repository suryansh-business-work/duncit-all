import { useId } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { AnalyticsTargetForm, toTargetValue, toTargetValues, type TargetValues } from './analytics-target';
import { ENTITY_ANALYTICS, SET_ANALYTICS_TARGET, type AnalyticsEntity, type AnalyticsKpi } from './queries';

interface Props {
  entity: AnalyticsEntity;
  kpi: AnalyticsKpi;
  /** The tile's name, as its heading reads. */
  title: string;
  onClose: () => void;
}

/** Set, change or remove the goal one tile is judged against; the dashboard redraws with it. */
export default function TargetDialog({ entity, kpi, title, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [setTarget, { loading }] = useMutation(SET_ANALYTICS_TARGET, { refetchQueries: [ENTITY_ANALYTICS] });

  const save = async (value: number | null, done: string) => {
    try {
      await setTarget({ variables: { entity, key: kpi.key, value } });
      notifySuccess(done);
      onClose();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  const submit = (values: TargetValues) => save(toTargetValue(values), t('analytics.target.saved'));
  const clear = () => {
    save(null, t('analytics.target.cleared')).catch(() => undefined);
  };
  const hasGoal = kpi.target_goal !== null && kpi.target_goal !== undefined;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{t('analytics.target.dialogTitle', { vars: { tile: title } })}</DialogTitle>
      <AnalyticsTargetForm
        defaultValues={toTargetValues(kpi.target_goal)}
        busy={loading}
        onClear={hasGoal ? clear : undefined}
        onCancel={onClose}
        onSubmit={submit}
      />
    </Dialog>
  );
}
