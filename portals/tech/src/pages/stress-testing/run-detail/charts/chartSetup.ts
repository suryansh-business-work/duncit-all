import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

/**
 * Registered ONCE for every chart on the run page. Chart.js keeps a global
 * registry, so a chart registering its own list could render blank because the
 * element it needed belonged to a sibling that had not mounted yet.
 */
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

/** The validated console palette, shared with every other console chart. */
export { chartSeriesColor as seriesColor } from '@duncit/ui';
