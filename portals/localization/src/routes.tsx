import { Route } from 'react-router';
import type { createAuthed } from '@duncit/shell';
import LocalesPage from './pages/locales/LocalesPage';
import TranslationsPage from './pages/translations/TranslationsPage';

/** The console's screens, beside the dashboard and profile every console has. */
export function localizationRoutes(authed: ReturnType<typeof createAuthed>) {
  return (
    <>
      <Route path="/locales" element={authed(<LocalesPage />)} />
      <Route path="/translations" element={authed(<TranslationsPage />)} />
    </>
  );
}
