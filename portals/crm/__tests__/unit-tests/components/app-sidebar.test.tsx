import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { matches, groupActive, bestChild } from '@/components/AppSidebar.helpers';
import AppSidebar from '@/components/AppSidebar';

describe('AppSidebar.helpers', () => {
  describe('matches', () => {
    it('returns false when "to" is missing', () => {
      expect(matches('/x', undefined)).toBe(false);
    });
    it('matches the root only when the pathname is exactly "/"', () => {
      expect(matches('/', '/')).toBe(true);
      expect(matches('/foo', '/')).toBe(false);
    });
    it('matches the exact path and any sub-segments', () => {
      expect(matches('/venue-leads', '/venue-leads')).toBe(true);
      expect(matches('/venue-leads/services', '/venue-leads')).toBe(true);
      expect(matches('/venue-leadsx', '/venue-leads')).toBe(false);
    });
  });

  describe('groupActive', () => {
    it('returns true when any direct child matches', () => {
      const item: any = {
        label: 'Venue',
        icon: 'support',
        children: [{ label: 'List', icon: 'support', to: '/venue-leads' }],
      };
      expect(groupActive('/venue-leads', item)).toBe(true);
    });
    it('returns false when no descendants match', () => {
      const item: any = {
        label: 'Venue',
        icon: 'support',
        children: [{ label: 'List', icon: 'support', to: '/venue-leads' }],
      };
      expect(groupActive('/other', item)).toBe(false);
    });
    it('returns true when nested descendants match', () => {
      const item: any = {
        label: 'Group',
        icon: 'groups',
        children: [
          {
            label: 'Inner',
            icon: 'groups',
            children: [{ label: 'Leaf', icon: 'support', to: '/venue-leads' }],
          },
        ],
      };
      expect(groupActive('/venue-leads', item)).toBe(true);
    });
  });

  describe('bestChild', () => {
    it('returns the child whose path is the longest matching prefix', () => {
      const children: any = [
        { label: 'List', to: '/host-leads' },
        { label: 'Services', to: '/host-leads/services' },
      ];
      expect(bestChild('/host-leads/services', children)?.to).toBe('/host-leads/services');
    });
    it('returns null when no children match', () => {
      const children: any = [{ label: 'X', to: '/x' }];
      expect(bestChild('/y', children)).toBeNull();
    });
    it('skips children without a "to" path', () => {
      const children: any = [{ label: 'Group' }, { label: 'L', to: '/y' }];
      expect(bestChild('/y', children)?.to).toBe('/y');
    });
  });
});

describe('AppSidebar (render)', () => {
  it('renders the app name and the nav labels', () => {
    render(
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={['/']}>
          <AppSidebar />
        </MemoryRouter>
      </MockedProvider>
    );
    expect(screen.getAllByText(/Duncit/i).length).toBeGreaterThan(0);
  });

  it('calls onNavigate when a leaf is clicked', () => {
    let clicked = 0;
    render(
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={['/']}>
          <AppSidebar onNavigate={() => { clicked += 1; }} />
        </MemoryRouter>
      </MockedProvider>
    );
    const link = screen.getAllByRole('link')[0];
    fireEvent.click(link);
    expect(clicked).toBeGreaterThan(0);
  });
});
