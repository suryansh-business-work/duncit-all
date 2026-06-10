import { useParams } from 'react-router-dom';
import { Alert } from '@mui/material';
import PolicyRenderer from '../components/PolicyRenderer';

export default function PolicyPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  if (!slug) return <Alert severity="warning">No policy specified.</Alert>;
  return <PolicyRenderer slug={slug} />;
}
