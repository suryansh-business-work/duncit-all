import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServiceGroupCard from './ServiceGroupCard';
import type { ServiceGroup, SummaryResponse } from '../types';

const group: ServiceGroup = {
  title: 'Consoles',
  items: [
    { key: 'admin', name: 'Admin', url: 'https://admin.test', description: 'Admin console' },
    { key: 'crm', name: 'CRM', url: 'https://crm.test', description: 'CRM console' },
  ],
};

const summary = {
  services: {
    admin: {
      latest: null,
      uptime_24h: 100,
      uptime_7d: 100,
      uptime_90d: 100,
      state: 'operational',
      active_incidents: 0,
      daily: [],
    },
  },
} as unknown as SummaryResponse;

describe('ServiceGroupCard', () => {
  it('renders the group title and a row per service (summary present or missing)', () => {
    render(<ServiceGroupCard group={group} summary={summary} onSelect={vi.fn()} />);
    expect(screen.getByText('Consoles')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    // CRM has no summary entry -> falls back to null (no-data row).
    expect(screen.getByText('CRM')).toBeTruthy();
  });

  it('renders even when there is no summary at all', () => {
    render(<ServiceGroupCard group={group} summary={null} onSelect={vi.fn()} />);
    expect(screen.getAllByText('No data').length).toBe(2);
  });
});
