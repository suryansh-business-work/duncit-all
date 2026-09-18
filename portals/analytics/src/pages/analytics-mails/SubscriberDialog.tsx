import { useId } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import {
  ANALYTICS_MAIL_SUBSCRIPTIONS,
  CREATE_ANALYTICS_MAIL_SUBSCRIPTION,
  UPDATE_ANALYTICS_MAIL_SUBSCRIPTION,
  type AnalyticsMailSubscription,
} from './queries';
import {
  AnalyticsMailSubscriberForm,
  emptySubscriber,
  toSubscriberValues,
  toSubscriptionInput,
  type SubscriberValues,
} from './analytics-mail-subscriber';

interface Props {
  /** The subscriber being edited; null adds a new one. */
  subscriber: AnalyticsMailSubscription | null;
  onClose: () => void;
}

/** Add a subscriber, or change who, what or how often an existing one receives. */
export default function SubscriberDialog({ subscriber, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const options = { refetchQueries: [ANALYTICS_MAIL_SUBSCRIPTIONS] };
  const [create, created] = useMutation(CREATE_ANALYTICS_MAIL_SUBSCRIPTION, options);
  const [update, updated] = useMutation(UPDATE_ANALYTICS_MAIL_SUBSCRIPTION, options);

  const submit = async (values: SubscriberValues) => {
    const input = toSubscriptionInput(values);
    try {
      if (subscriber) {
        await update({ variables: { id: subscriber.id, input } });
        notifySuccess(t('analytics.mails.subscriberSaved'));
      } else {
        await create({ variables: { input } });
        notifySuccess(t('analytics.mails.subscriberAdded'));
      }
      onClose();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  const title = subscriber ? t('analytics.mails.editSubscriber') : t('analytics.mails.addSubscriber');
  const defaults = subscriber ? toSubscriberValues(subscriber) : emptySubscriber();

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <AnalyticsMailSubscriberForm
        defaultValues={defaults}
        busy={created.loading || updated.loading}
        onCancel={onClose}
        onSubmit={submit}
      />
    </Dialog>
  );
}
