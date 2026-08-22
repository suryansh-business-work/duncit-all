import { useParams } from 'react-router-dom';
import { Alert } from '@mui/material';
import PolicyRenderer from '../components/PolicyRenderer';
import { useTranslation } from '../i18n/useTranslation';

export default function PolicyPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  if (!slug) return <Alert severity="warning">{t('mweb.policyPage.noPolicySpecified')}</Alert>;
  return <PolicyRenderer slug={slug} />;
}
