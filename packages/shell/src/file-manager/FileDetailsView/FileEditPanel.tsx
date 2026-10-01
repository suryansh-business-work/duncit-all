import { Autocomplete, Chip, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  name: string;
  onName: (value: string) => void;
  /** Nothing to save while the name still matches the stored one. */
  nameUnchanged: boolean;
  tags: string[];
  onTags: (value: string[]) => void;
  /** A rename or a tag save is in flight. */
  busy: boolean;
  onSaveName: () => void;
  onSaveTags: () => void;
}

/** The only tab that changes anything stored: the file's name and its tags. */
export default function FileEditPanel({
  name,
  onName,
  nameUnchanged,
  tags,
  onTags,
  busy,
  onSaveName,
  onSaveTags,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Stack spacing={1} sx={{
        alignItems: "flex-start"
      }}>
        <TextField
          fullWidth
          size="small"
          label={t('shell.fileManager.fileName')}
          value={name}
          onChange={(event) => onName(event.target.value)}
          helperText={t('shell.fileManager.renameHint')}
        />
        <DuncitButton size="small" onClick={onSaveName} disabled={busy || nameUnchanged}>
          Save
        </DuncitButton>
      </Stack>
      <Stack spacing={1} sx={{
        alignItems: "flex-start"
      }}>
        <Autocomplete
          multiple
          freeSolo
          fullWidth
          size="small"
          options={[]}
          value={tags}
          onChange={(_event, next) => onTags(next.map((tag) => String(tag).trim()).filter(Boolean))}
          renderValue={(value, getItemProps) =>
            value.map((tag, index) => {
              // getTagProps supplies the key; spreading it after an explicit
              // one would let React's own win and break deletion.
              const { key, ...rest } = getItemProps({ index });
              return <Chip key={key} size="small" label={tag} {...rest} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('shell.fileManager.tags')}
              helperText={t('shell.fileManager.tagsHint')}
            />
          )}
        />
        <DuncitButton size="small" onClick={onSaveTags} disabled={busy}>
          Save
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
