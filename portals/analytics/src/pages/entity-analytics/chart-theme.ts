import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Chart.js keeps one global registry; this is everything the Analytics charts draw.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

/** The shared console chart frame — one copy in @duncit/ui (rule 40). */
export { categoryAxis, chartTooltip, valueAxis } from '@duncit/ui';
