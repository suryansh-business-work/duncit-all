import { SectionCard } from '@duncit/ui';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { UpdateForm } from './update.form';

export { UpdateForm } from './update.form';
export { makeUpdateSchema } from './update.types';
export type { UpdateValues } from './update.types';

/** Email every confirmed guest. */
export function UpdatesTab({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  return (
    <SectionCard title={t('liteWeb.manage.updates.title')} subtitle={t('liteWeb.manage.updates.subtitle', { count: event.stats.going })}>
      <UpdateForm eventId={event.id} goingCount={event.stats.going} />
    </SectionCard>
  );
}
