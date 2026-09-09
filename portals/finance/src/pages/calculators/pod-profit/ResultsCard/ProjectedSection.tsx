import { Divider } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { formatRupees, type PodProfitScaled } from '../types';
import CostsSection from './CostsSection';
import { Row, SectionLabel, type Emphasis } from './Row';

interface Props {
  scaled: PodProfitScaled;
  /** The host row's colour, decided once by the parent so both blocks agree. */
  hostEmphasis: Emphasis;
}

/**
 * The same pod, times `pod_count`.
 *
 * Shown only above a count of 1: for a single pod every figure here repeats the
 * block above it, and a screen that says the same number twice reads as a bug.
 */
export default function ProjectedSection({ scaled, hostEmphasis }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider sx={{ my: 1 }} />
      <SectionLabel text={t('finance.calculators.acrossAllPods')} />
      <Row
        label={t('finance.calculators.totalNumberOfPods')}
        value={String(scaled.pod_count)}
        detail={t('finance.calculators.everyFigureBelowTimesCount')}
      />
      <Row
        label={t('finance.calculators.totalCollection')}
        value={formatRupees(scaled.collection_total)}
      />
      <Row
        label={t('finance.calculators.duncitRevenue')}
        value={formatRupees(scaled.duncit_revenue_total)}
        emphasis="primary"
      />
      <Row
        label={t('finance.calculators.venueReceives')}
        value={formatRupees(scaled.venue_receives)}
        emphasis="success"
      />
      <Row
        label={t('finance.calculators.hostReceives')}
        value={formatRupees(scaled.host_receives)}
        emphasis={hostEmphasis}
      />
      <Row label={t('finance.calculators.gst')} value={formatRupees(scaled.gst_amount)} emphasis="warning" />
      <CostsSection
        expenses={scaled.expenses}
        expenseTotal={scaled.expense_total}
        venueNet={scaled.venue_net}
        hostNet={scaled.host_net}
        duncitNet={scaled.duncit_net}
      />
    </>
  );
}
