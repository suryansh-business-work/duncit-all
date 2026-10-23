import type { ReactElement } from 'react';
import { Navigate, Route } from 'react-router';
import AmenitiesPage from './AmenitiesPage';
import CalendarPage from './CalendarPage';
import FeesPage from './FeesPage';
import FoodSettingsPage from './FoodSettingsPage';
import LeavesPage from './LeavesPage';
import PriceRulesPage from './PriceRulesPage';
import TypeCapacityPage from './TypeCapacityPage';

/**
 * The routes of the pages that set a venue up — each a Venue Options page of
 * its own, for a venue at any status — and the old Venue Pricing Module links,
 * which land on the venue's fees. `authed` is the console's page wrapper.
 */
export function venueSetupRoutes(authed: (page: ReactElement) => ReactElement) {
  return (
    <>
      <Route path="/venues/calendar" element={authed(<CalendarPage />)} />
      <Route path="/venues/type-capacity" element={authed(<TypeCapacityPage />)} />
      <Route path="/venues/amenities" element={authed(<AmenitiesPage />)} />
      <Route path="/venues/leaves" element={authed(<LeavesPage />)} />
      <Route path="/venues/fees" element={authed(<FeesPage />)} />
      <Route path="/venues/price-rules" element={authed(<PriceRulesPage />)} />
      <Route path="/venues/food-settings" element={authed(<FoodSettingsPage />)} />
      <Route path="/venues/pricing" element={<Navigate to="/venues/fees" replace />} />
      <Route path="/venues/:venueId/pricing" element={<Navigate to="/venues/fees" replace />} />
      <Route path="/venues/availability" element={<Navigate to="/venues/fees" replace />} />
      <Route path="/venues/:venueId/availability" element={<Navigate to="/venues/fees" replace />} />
    </>
  );
}
