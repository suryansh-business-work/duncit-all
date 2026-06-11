import { useEffect, useState } from 'react';
import { notify } from '../../components/notify';

const SAVED_CLUBS_KEY = 'duncit_saved_clubs';

function readSavedClubs() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_CLUBS_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

export default function useSavedClub(clubId: string) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    setSaved(readSavedClubs().includes(clubId));
  }, [clubId]);

  const toggleSaved = () => {
    const nextSaved = !saved;
    setSaving(true);
    const savedClubs = readSavedClubs();
    const updated = nextSaved
      ? Array.from(new Set([...savedClubs, clubId]))
      : savedClubs.filter((savedClubId) => savedClubId !== clubId);
    localStorage.setItem(SAVED_CLUBS_KEY, JSON.stringify(updated));
    setSaved(nextSaved);
    notify(nextSaved ? 'Saved' : 'Removed from saved', 'success');
    window.setTimeout(() => setSaving(false), 180);
  };

  return { saved, saving, toggleSaved };
}