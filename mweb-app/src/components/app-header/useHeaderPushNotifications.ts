import { useEffect, useState } from 'react';
import { ensurePushSubscription, notificationPermission } from '../../pwa';

export interface PushToast {
  title: string;
  body: string;
}

export function useHeaderPushNotifications(refetchNotifs: () => Promise<unknown>) {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationPermission()
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [toast, setToast] = useState<PushToast | null>(null);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const ok = await ensurePushSubscription();
      setPerm(notificationPermission());
      if (!ok) setToast({ title: 'Notifications', body: 'Permission was not granted.' });
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === 'PUSH_RECEIVED') {
        setToast({ title: msg.payload?.title ?? 'Duncit', body: msg.payload?.body ?? '' });
        refetchNotifs().catch(() => undefined);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [refetchNotifs]);

  return { perm, pushBusy, toast, setToast, enablePush };
}
