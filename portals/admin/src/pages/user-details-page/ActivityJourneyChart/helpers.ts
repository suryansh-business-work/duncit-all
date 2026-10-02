export interface ActivityEvent {
  id: string;
  event_type: string;
  path: string;
  title: string;
  target_text?: string;
  target_label?: string;
  occurred_at: string;
}

export const pageLabel = (event: ActivityEvent) => event.title || event.path || 'Untitled page';
export const eventLabel = (event: ActivityEvent) => event.target_label || event.target_text || pageLabel(event);

export function actionColor(action: string): 'success' | 'info' | 'warning' | 'default' {
  if (action === 'CLICK') return 'success';
  if (action === 'TOUCH') return 'warning';
  if (action === 'PAGE_VIEW') return 'info';
  return 'default';
}
