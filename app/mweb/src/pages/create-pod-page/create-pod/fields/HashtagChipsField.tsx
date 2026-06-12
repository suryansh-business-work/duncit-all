import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Box, Chip, TextField } from '@mui/material';
import type { CreatePodForm } from '../create-pod.types';

/** Splits the stored hashtag text into clean tags (no #, no blanks). */
export const parseHashtags = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((item) => item.replace(/^#/, '').trim())
        .filter(Boolean)
    )
  );

const serializeHashtags = (tags: string[]): string => tags.map((tag) => `#${tag}`).join(' ');

interface Props {
  form: CreatePodForm;
}

/** Hashtags as chips — type a tag and press Enter/space/comma to add it; the
 * chips serialize back into the form's pod_hashtag_text. */
export default function HashtagChipsField({ form }: Readonly<Props>) {
  const [draft, setDraft] = useState('');

  return (
    <Controller
      control={form.control}
      name="pod_hashtag_text"
      render={({ field }) => {
        const tags = parseHashtags(field.value ?? '');
        const commit = () => {
          const next = parseHashtags(draft);
          if (next.length === 0) return;
          field.onChange(serializeHashtags([...tags, ...next]));
          setDraft('');
        };
        const removeTag = (tag: string) => {
          field.onChange(serializeHashtags(tags.filter((item) => item !== tag)));
        };
        const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        };
        return (
          <Box>
            {tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={() => removeTag(tag)}
                    sx={{ fontWeight: 800 }}
                  />
                ))}
              </Box>
            )}
            <TextField
              label="Hashtags"
              fullWidth
              placeholder="Type a tag and press Enter"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={commit}
              helperText="Press Enter, space or comma to add a tag."
            />
          </Box>
        );
      }}
    />
  );
}
