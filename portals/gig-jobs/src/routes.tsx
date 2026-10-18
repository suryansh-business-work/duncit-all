import { Route } from 'react-router';
import type { createAuthed } from '@duncit/shell';
import GigJobsPage from './pages/gigs/GigJobsPage';
import InterestsPage from './pages/interests/InterestsPage';
import FreelancersPage from './pages/freelancers/FreelancersPage';
import GigCategoriesPage from './pages/categories/GigCategoriesPage';

/** The console's screens; `/` (the dashboard) and `/profile` come from the shell. */
export function gigRoutes(authed: ReturnType<typeof createAuthed>) {
  return (
    <>
      <Route path="/gigs" element={authed(<GigJobsPage />)} />
      <Route path="/interests" element={authed(<InterestsPage />)} />
      <Route path="/freelancers" element={authed(<FreelancersPage />)} />
      <Route path="/categories" element={authed(<GigCategoriesPage />)} />
    </>
  );
}
