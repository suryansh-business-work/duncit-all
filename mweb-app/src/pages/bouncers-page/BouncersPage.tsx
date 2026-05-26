import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PodPicker from './PodPicker';
import BouncerSosScreen from './BouncerSosScreen';
import BouncerSupportScreen from './BouncerSupportScreen';
import BouncerFeedbackScreen from './BouncerFeedbackScreen';
import { usePodPicker } from './usePodPicker';

type TabKey = 'sos' | 'support' | 'feedback';
const TAB_KEYS: TabKey[] = ['sos', 'support', 'feedback'];

export default function BouncersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { options, selected, selectedId, setSelectedId, loading } = usePodPicker();

  const initialTab = (params.get('tab') as TabKey) ?? 'sos';
  const [tab, setTab] = useState<TabKey>(TAB_KEYS.includes(initialTab) ? initialTab : 'sos');

  const handleTab = (next: TabKey) => {
    setTab(next);
    const merged = new URLSearchParams(params);
    merged.set('tab', next);
    setParams(merged, { replace: true });
  };

  return (
    <Stack spacing={2.25} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
          Bouncers
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(33,150,243,0.08)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <SecurityIcon color="primary" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
              Your safety crew, one tap away
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pick the pod you are at — SOS, support and live feedback are scoped to it.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <PodPicker
        options={options}
        selectedId={selectedId}
        onChange={setSelectedId}
        loading={loading}
      />

      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => handleTab(v as TabKey)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="sos"
            icon={<ReportGmailerrorredIcon fontSize="small" />}
            iconPosition="start"
            label="SOS"
            sx={{ fontWeight: 800, minHeight: 48 }}
          />
          <Tab
            value="support"
            icon={<SupportAgentIcon fontSize="small" />}
            iconPosition="start"
            label="Support"
            sx={{ fontWeight: 800, minHeight: 48 }}
          />
          <Tab
            value="feedback"
            icon={<RateReviewIcon fontSize="small" />}
            iconPosition="start"
            label="Feedback"
            sx={{ fontWeight: 800, minHeight: 48 }}
          />
        </Tabs>
      </Paper>

      <Box>
        {tab === 'sos' && <BouncerSosScreen selected={selected} />}
        {tab === 'support' && <BouncerSupportScreen selected={selected} />}
        {tab === 'feedback' && <BouncerFeedbackScreen selected={selected} />}
      </Box>
    </Stack>
  );
}
