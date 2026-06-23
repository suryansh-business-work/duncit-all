import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArcElement, Chart as ChartJS, Legend, Tooltip, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  venue: number;
  host: number;
  products: number;
  currency?: string;
}

export default function EarningsBreakdownChart({ venue, host, products, currency = '₹' }: Readonly<Props>) {
  const theme = useTheme();
  const total = venue + host + products;
  if (total <= 0) {
    return <Typography color="text.secondary">No earnings in this range yet.</Typography>;
  }

  const data = {
    labels: ['Venue', 'Host', 'Products'],
    datasets: [
      {
        data: [venue, host, products],
        backgroundColor: ['#6366f1', '#0f766e', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: theme.palette.text.secondary,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'doughnut'>) =>
            `${item.label}: ${currency}${Number(item.raw ?? 0).toLocaleString('en-IN')}`,
        },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
