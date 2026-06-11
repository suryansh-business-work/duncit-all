import { useEffect, useMemo, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Box, Typography } from '@mui/material';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface AnalyticsPoint {
  date: string;
  in_qty: number;
  out_qty: number;
  net_qty: number;
}

interface InventoryAnalyticsChartProps {
  points: AnalyticsPoint[];
  loading: boolean;
}

export default function InventoryAnalyticsChart({ points, loading }: Readonly<InventoryAnalyticsChartProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const { labels, ins, outs } = useMemo(() => {
    return {
      labels: points.map((p) => p.date.slice(5)),
      ins: points.map((p) => p.in_qty),
      outs: points.map((p) => p.out_qty),
    };
  }, [points]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = ins;
      chartRef.current.data.datasets[1].data = outs;
      chartRef.current.update();
      return;
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'In', data: ins, backgroundColor: 'rgba(46,125,50,0.7)' },
          { label: 'Out', data: outs, backgroundColor: 'rgba(211,47,47,0.7)' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }, [labels, ins, outs]);

  useEffect(() => () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  }, []);

  if (loading && points.length === 0) {
    return <Typography variant="body2" color="text.secondary">Loading analytics…</Typography>;
  }
  if (points.every((p) => p.in_qty === 0 && p.out_qty === 0)) {
    return (
      <Typography variant="body2" color="text.secondary">
        No stock activity in the last 30 days.
      </Typography>
    );
  }
  return (
    <Box sx={{ height: 200 }}>
      <canvas ref={canvasRef} />
    </Box>
  );
}
