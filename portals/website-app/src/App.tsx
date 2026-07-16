import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import {
  DashboardPage,
  CareersPage,
  NewsroomPage,
  BlogPage,
  NewsletterPage,
  ContactSubmissionsPage,
  FaqSubmissionsPage,
  JobApplicationsPage,
  NavigationPage,
} from './pages/website';
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
      <Route path="/faq-submissions" element={authed(<FaqSubmissionsPage />)} />
      <Route path="/job-applications" element={authed(<JobApplicationsPage />)} />
      <Route path="/navigation" element={authed(<NavigationPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
