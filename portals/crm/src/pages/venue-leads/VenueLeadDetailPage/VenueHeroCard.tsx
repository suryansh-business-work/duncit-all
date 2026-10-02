import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { DuncitButton } from '@duncit/buttons';
import type { VenueLead } from '../../../api/crm.types';
import { PriorityChip, StatusChip } from '../../../components/StatusChips';
import LeadContactActions from '../../../components/LeadContactActions';
import { MatchedUserChip } from '../../../components/MatchedUserBox';
import { venueVariableValues } from '../../../config/leadVariables';
import type { TranslateFn } from './helpers';

interface Props {
  lead: VenueLead;
  t: TranslateFn;
  onAskAi: () => void;
  onEdit: () => void;
}

/** Hero card (Venue details on top, per spec). */
export default function VenueHeroCard({ lead, t, onAskAi, onEdit }: Readonly<Props>) {
  return (
    <Card
      sx={(t) => ({
        background: `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${alpha(
          t.palette.background.paper,
          1
        )} 60%)`,
      })}
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          {lead.logo_url && (
            <Avatar alt=""
              src={lead.logo_url}
              variant="rounded"
              sx={{ width: 56, height: 56, bgcolor: 'action.hover' }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h1"
              variant="h5"
              sx={{
                fontWeight: 800,
                wordBreak: 'break-word'
              }}>
              {lead.venue_name}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap",
                mt: 1
              }}>
              <StatusChip value={lead.lead_status} />
              <PriorityChip value={lead.priority} />
              {lead.city && (
                <Chip
                  size="small"
                  icon={<LocationOnIcon fontSize="small" />}
                  label={lead.city}
                  variant="outlined"
                />
              )}
              {lead.super_category?.name && (
                <Chip size="small" color="primary" label={lead.super_category.name} variant="outlined" />
              )}
              {lead.matched_user && <MatchedUserChip matched={lead.matched_user} />}
              {(lead.venue_types ?? []).slice(0, 2).map((tag) => (
                <Chip key={tag} size="small" label={tag} variant="outlined" />
              ))}
              {(lead.venue_types?.length ?? 0) > 2 && (
                <Chip size="small" label={`+${(lead.venue_types?.length ?? 0) - 2} more`} variant="outlined" />
              )}
            </Stack>
            {lead.tags.length > 0 && (
              <Stack
                direction="row"
                spacing={0.5}
                useFlexGap
                data-testid="venue-tags"
                sx={{
                  flexWrap: "wrap",
                  mt: 1
                }}>
                {lead.tags.map((t) => (
                  <Chip key={t} size="small" label={`#${t}`} variant="outlined" />
                ))}
              </Stack>
            )}
            <LeadContactActions
              entity="VENUE_LEAD"
              leadId={lead.id}
              displayName={lead.venue_name}
              email={lead.contacts?.[0]?.email}
              mobile={lead.contacts?.[0]?.mobile_number}
              whatsapp={lead.contacts?.[0]?.whatsapp_number}
              variableValues={venueVariableValues(lead)}
            />
          </Box>
          <DuncitButton startIcon={<SmartToyIcon />} color="secondary" variant="outlined" onClick={onAskAi}>
            {t('crm.components.askAi')}
          </DuncitButton>
          <DuncitButton startIcon={<EditIcon />} variant="contained" onClick={onEdit}>
            {t('shell.common.edit')}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
