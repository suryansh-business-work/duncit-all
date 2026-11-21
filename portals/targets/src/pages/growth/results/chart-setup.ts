import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Chart.js keeps one global registry; this is everything the Growth Calculator draws.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

/** Months 1–12 of a steady month: what a monthly figure adds up to by each month. */
export function cumulativeByMonth(monthly: number): number[] {
  return Array.from({ length: 12 }, (_, index) => monthly * (index + 1));
}
