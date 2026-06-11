import * as Yup from 'yup';

export const commentSchema = Yup.object({
  text: Yup.string().trim().required('Required').max(1000, 'Max 1000 chars'),
});

export const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
};
