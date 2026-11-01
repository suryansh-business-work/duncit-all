import { useFieldArray, type Control } from 'react-hook-form';
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { MAX_QUERY_LENGTH, MAX_SHOT_LENGTH, blankScriptScene, type ReelScriptFormValues } from './reel-script.types';

interface Props {
  control: Control<ReelScriptFormValues>;
}

/** The script's scenes, each editable in place: what is said, what is shown, for how long, and what footage to look for. */
export default function ScriptSceneFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'scenes' });
  const seconds = { step: 0.1, min: REEL_EDIT_LIMITS.minSceneMs / 1000, max: REEL_EDIT_LIMITS.maxSceneMs / 1000 };

  return (
    <Stack spacing={1.5} role="group" aria-label={t('ai.reels.create.scenesLabel')} data-testid="reel-script-scenes">
      {fields.map((field, index) => {
        const number = index + 1;
        return (
          <Paper key={field.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid={`reel-script-scene-${number}`}>
            <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" component="h4" sx={{ flex: 1 }}>
                {t('ai.reels.editor.sceneTitle', { vars: { number } })}
              </Typography>
              <Tooltip title={t('ai.reels.create.removeScene')}>
                <span>
                  <DuncitIconButton
                    size="small"
                    aria-label={t('ai.reels.create.removeSceneNamed', { vars: { number } })}
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    data-testid={`reel-script-remove-${number}`}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </DuncitIconButton>
                </span>
              </Tooltip>
            </Stack>
            <Stack spacing={1}>
              <RhfTextField
                control={control}
                name={`scenes.${index}.text`}
                label={t('ai.reels.create.fieldSceneText')}
                multiline
                minRows={2}
                size="small"
                required
                slotProps={{ htmlInput: { maxLength: REEL_EDIT_LIMITS.maxTextLength, 'data-testid': `reel-script-text-${number}` } }}
              />
              <RhfTextField
                control={control}
                name={`scenes.${index}.shot`}
                label={t('ai.reels.create.fieldSceneShot')}
                size="small"
                slotProps={{ htmlInput: { maxLength: MAX_SHOT_LENGTH, 'data-testid': `reel-script-shot-${number}` } }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                <RhfTextField
                  control={control}
                  name={`scenes.${index}.duration_s`}
                  label={t('ai.reels.editor.fieldDuration')}
                  type="number"
                  size="small"
                  slotProps={{ htmlInput: { ...seconds, 'data-testid': `reel-script-duration-${number}` } }}
                />
                <RhfTextField
                  control={control}
                  name={`scenes.${index}.asset_query`}
                  label={t('ai.reels.create.fieldSceneQuery')}
                  size="small"
                  slotProps={{ htmlInput: { maxLength: MAX_QUERY_LENGTH, 'data-testid': `reel-script-query-${number}` } }}
                />
              </Box>
            </Stack>
          </Paper>
        );
      })}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        disabled={fields.length >= REEL_EDIT_LIMITS.maxScenes}
        onClick={() => append(blankScriptScene())}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-script-add-scene"
      >
        {t('ai.reels.create.addScene')}
      </DuncitButton>
    </Stack>
  );
}
