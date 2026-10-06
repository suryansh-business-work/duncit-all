import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import {
  DashboardPage,
  CareersPage,
  NewsroomPage,
  BlogPage,
  NewsletterPage,
  ContactSubmissionsPage,
  JobApplicationsPage,
  NavigationPage,
  ReelsPage,
  ReelSettingsPage,
} from './pages/website';
import { CmsEditorPage, EntryEditorPage, SitesPage, SiteWorkspacePage } from './pages/cms';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/careers" element={authed(<CareersPage />)} />
      <Route path="/newsroom" element={authed(<NewsroomPage />)} />
      <Route path="/blog" element={authed(<BlogPage />)} />
      <Route path="/newsletter" element={authed(<NewsletterPage />)} />
      <Route path="/contact-submissions" element={authed(<ContactSubmissionsPage />)} />
      <Route path="/job-applications" element={authed(<JobApplicationsPage />)} />
      <Route path="/navigation" element={authed(<NavigationPage />)} />
      <Route path="/reels" element={authed(<ReelsPage />)} />
      <Route path="/reels/settings" element={authed(<ReelSettingsPage />)} />
      <Route path="/sites" element={authed(<SitesPage />)} />
      <Route path="/sites/:siteId" element={authed(<SiteWorkspacePage />)} />
      <Route path="/sites/:siteId/:target/:docId/design" element={authed(<CmsEditorPage />)} />
      <Route path="/sites/:siteId/:collectionSlug/:entryId" element={authed(<EntryEditorPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
