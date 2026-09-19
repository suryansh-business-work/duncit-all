/**
 * Records every `notify()` toast from `@duncit/dialogs`.
 *
 * `notifySuccess` dispatches a window event that the portal's NotifyHost turns
 * into a snackbar. The suites mount pages without that host, so they listen for
 * the event itself — the message is exactly what a partner would read.
 */
const NOTIFY_EVENT = 'duncit:notify';

interface NoticeDetail {
  message: string;
  severity: string;
}

export function recordNotices() {
  const notices: NoticeDetail[] = [];
  const listener = (event: Event) => {
    notices.push((event as CustomEvent<NoticeDetail>).detail);
  };
  globalThis.addEventListener(NOTIFY_EVENT, listener);
  return {
    notices,
    stop: () => globalThis.removeEventListener(NOTIFY_EVENT, listener),
  };
}
