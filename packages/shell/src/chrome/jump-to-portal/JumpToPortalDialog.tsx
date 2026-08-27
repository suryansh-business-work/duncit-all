import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, List, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_PORTAL_ACCESS, REQUEST_PORTAL_ACCESS, type PortalAccessEntry } from './queries';
import { PortalLinkRow, PortalRequestRow } from './PortalRows';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * The Jump to Portal dialog behind the apps drawer's tool of the same name:
 * every Duncit console, split into the ones this user's roles open and the
 * ones they can ask an admin for. The split comes from the server — the same
 * map the login gate enforces — so the two can never disagree.
 */
export function JumpToPortalDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(MY_PORTAL_ACCESS, {
    fetchPolicy: 'cache-and-network',
    skip: !open,
  });
  const [requestAccess] = useMutation(REQUEST_PORTAL_ACCESS);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const portals: PortalAccessEntry[] = useMemo(() => data?.myPortalAccess ?? [], [data]);
  const accessible = useMemo(() => portals.filter((p) => p.has_access), [portals]);
  const locked = useMemo(() => portals.filter((p) => !p.has_access), [portals]);

  const handleRequest = async (portalKey: string) => {
    setBusyKey(portalKey);
    setRequestError(null);
    try {
      await requestAccess({ variables: { portal_key: portalKey } });
      await refetch();
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : t('shell.jumpToPortal.requestFailed'));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('shell.jumpToPortal.title')}
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('shell.jumpToPortal.subtitle')}
        </Typography>
        <DuncitIconButton
          onClick={onClose}
          aria-label={t('shell.jumpToPortal.close')}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        {loading && !data && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && !data && <Alert severity="error">{t('shell.jumpToPortal.loadError')}</Alert>}
        {portals.length > 0 && (
          <Stack spacing={1}>
            {requestError && (
              <Alert severity="error" onClose={() => setRequestError(null)}>
                {requestError}
              </Alert>
            )}
            <Accordion defaultExpanded disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Typography sx={{
                    fontWeight: 700
                  }}>{t('shell.jumpToPortal.accessTitle')}</Typography>
                  <Chip size="small" label={accessible.length} />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {accessible.length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      px: 2,
                      py: 1
                    }}>
                    {t('shell.jumpToPortal.noneAccessible')}
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {accessible.map((portal) => (
                      <PortalLinkRow key={portal.key} portal={portal} />
                    ))}
                  </List>
                )}
              </AccordionDetails>
            </Accordion>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Typography sx={{
                    fontWeight: 700
                  }}>{t('shell.jumpToPortal.noAccessTitle')}</Typography>
                  <Chip size="small" label={locked.length} />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {locked.length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      px: 2,
                      py: 1
                    }}>
                    {t('shell.jumpToPortal.allAccess')}
                  </Typography>
                ) : (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        px: 2
                      }}>
                      {t('shell.jumpToPortal.noAccessHint')}
                    </Typography>
                    <List dense disablePadding>
                      {locked.map((portal) => (
                        <PortalRequestRow
                          key={portal.key}
                          portal={portal}
                          busy={busyKey === portal.key}
                          onRequest={handleRequest}
                        />
                      ))}
                    </List>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
