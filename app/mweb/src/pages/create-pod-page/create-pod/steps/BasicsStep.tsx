import { Controller } from 'react-hook-form';
import { Accordion, AccordionDetails, AccordionSummary, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import ChipArrayField from '../fields/ChipArrayField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, feature image(s) and hashtags,
 * with optional extras (info, offers, perks) tucked into an accordion. */
export default function BasicsStep({ form }: Readonly<Props>) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={2}>
      <TextField
        label="Pod title"
        required
        fullWidth
        {...register('pod_title')}
        error={!!errors.pod_title}
        helperText={errors.pod_title?.message ?? 'What is this pod about? (3–120 characters)'}
      />
      <TextField
        label="Pod description"
        required
        fullWidth
        multiline
        minRows={4}
        {...register('pod_description')}
        error={!!errors.pod_description}
        helperText={errors.pod_description?.message ?? 'Tell people what to expect — agenda, vibe, who it is for'}
      />
      <MediaUrlsField form={form} />
      <HashtagChipsField form={form} />
      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={800}>More details (optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Pod info / additional notes"
              fullWidth
              multiline
              minRows={2}
              helperText="Logistics, what to bring, parking notes, etc."
              {...register('pod_info')}
            />
            <Controller
              control={control}
              name="what_this_pod_offers"
              render={({ field, fieldState }) => (
                <ChipArrayField
                  label="What this pod offers"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  placeholder="e.g. Coaching, Snacks — press Enter"
                />
              )}
            />
            <Controller
              control={control}
              name="available_perks"
              render={({ field, fieldState }) => (
                <ChipArrayField
                  label="Available perks"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  placeholder="e.g. Free parking, Goodies — press Enter"
                />
              )}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
