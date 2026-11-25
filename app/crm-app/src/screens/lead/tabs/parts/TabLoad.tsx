import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';

interface QueryLike {
  data: unknown;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * What a tab shows until its lead is there: loading, the worded error with a
 * retry, or "not found" when the read came back without the lead.
 */
export function TabLoad({ query }: Readonly<{ query: QueryLike }>) {
  const { t } = useTranslation();
  if (query.data && !query.loading) {
    return <StateView error={t('crmApp.lead.notFound')} onRetry={query.refetch} />;
  }
  return <StateView loading={query.loading} error={query.error} onRetry={query.refetch} />;
}
