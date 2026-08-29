import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClubPodsCard from '../ClubPodsCard';
import type { ClubPodRow } from '../types';

const makePod = (over: Partial<ClubPodRow> = {}): ClubPodRow => ({
  id: 'pod1',
  pod_title: 'Weekend Trek',
  pod_date_time: '2026-03-01T09:00:00.000Z',
  pod_type: 'PAID',
  pod_amount: 499,
  is_active: true,
  ...over,
});

const renderCard = (pods: ClubPodRow[]) => render(<ClubPodsCard pods={pods} />, { wrapper: MemoryRouter });

describe('ClubPodsCard', () => {
  it('shows the empty state and a zero count when there are no pods', () => {
    renderCard([]);
    expect(screen.getByText('No pods in this club yet.')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('lists a pod with a real formatted date, its price and active status', () => {
    renderCard([makePod()]);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Weekend Trek')).toBeInTheDocument();
    // The exact day text depends on the machine's local time zone (formatDate
    // is not time-zone-aware by default); what matters is that a real date was
    // formatted (not the em-dash fallback) alongside the price.
    const secondary = screen.getByText((_, el) => el?.textContent?.endsWith('· ₹499') ?? false);
    expect(secondary.textContent).not.toMatch(/^—/);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Free" for a pod_type that contains FREE', () => {
    renderCard([makePod({ pod_type: 'FREE_ENTRY' })]);
    expect(screen.getByText((_, el) => el?.textContent?.endsWith('· Free') ?? false)).toBeInTheDocument();
  });

  it('shows an em-dash for the date when pod_date_time is missing', () => {
    renderCard([makePod({ pod_date_time: null })]);
    expect(screen.getByText((_, el) => el?.textContent === '— · ₹499')).toBeInTheDocument();
  });

  it('shows the Inactive chip for an inactive pod', () => {
    renderCard([makePod({ is_active: false })]);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('treats a null pod_type as not free', () => {
    renderCard([makePod({ pod_type: null })]);
    expect(screen.getByText((_, el) => el?.textContent?.endsWith('· ₹499') ?? false)).toBeInTheDocument();
  });

  it('navigates to the pod detail page when a pod row is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/clubs/c1']}>
        <Routes>
          <Route path="/clubs/:id" element={<ClubPodsCard pods={[makePod({ id: 'pod-42' })]} />} />
          <Route path="/pods/:podId" element={<div>POD DETAIL ROUTE</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Weekend Trek'));
    expect(screen.getByText('POD DETAIL ROUTE')).toBeInTheDocument();
  });
});
