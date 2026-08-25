import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BlockIcon from '@mui/icons-material/Block';
import { POD_GUIDELINE_RULE_KEYS } from './create-pod.form';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "What AI monitors" dialog — the AI content check + the community guidelines
 * every pod must follow, and the consequences of breaking them. */
export default function PodGuidelinesDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth data-testid="pod-guidelines-dialog">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <AutoAwesomeIcon color="primary" /> {t('mweb.createPod.aiMonitors')}
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          {t('mweb.createPod.guidelinesIntro')}
        </Typography>
        <List dense disablePadding>
          {POD_GUIDELINE_RULE_KEYS.map((key) => (
            <ListItem key={key} disableGutters sx={{ alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 30, mt: 0.5, color: 'error.main' }}>
                <BlockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t(key)} slotProps={{
                primary: { variant: 'body2' }
              }} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
            {t('mweb.createPod.guidelinesWarning')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" data-testid="pod-guidelines-close">
          {t('mweb.createPod.gotIt')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
