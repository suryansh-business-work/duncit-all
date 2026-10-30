import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StatCard } from '@duncit/ui';

interface SupportStatCardProps {
  label: string;
  count: number;
  icon: ReactNode;
  color: string;
  to: string;
}

/** One dashboard KPI tile: icon-left count that navigates to its list page. */
export default function SupportStatCard({ label, count, icon, color, to }: Readonly<SupportStatCardProps>) {
  const navigate = useNavigate();
  return (
    <StatCard
      layout="valueFirst"
      label={label}
      value={count}
      icon={icon}
      iconColor={color}
      onClick={() => navigate(to)}
      valueVariant="h4"
      valueSx={{ lineHeight: 1 }}
      sx={{ height: '100%' }}
      testId={`support-stat-${to.replaceAll('/', '-').slice(1)}`}
    />
  );
}
