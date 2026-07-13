import { useEffect } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { NAV_AREAS, NAV_SITES, type WebsiteNavItem } from './queries';

const navItemSchema = z.object({
  site: z.enum(['MAIN', 'PARTNERS', 'ADS', 'EARNWITH']),
  area: z.enum(['HEADER', 'FOOTER']),
  group_label: z.string().trim().max(60, 'Max 60 characters'),
  label: z.string().trim().min(1, 'Label is required').max(80, 'Max 80 characters'),
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .refine(
      (value) => value.startsWith('/') || /^(mailto:|tel:|https?:\/\/)/i.test(value),
      'Use an http(s) link, a site-relative path, mailto or tel',
    ),
  sort_order: z.coerce.number().int('Whole number').min(0, 'Must be 0 or more'),
  is_active: z.boolean(),
});

export type NavItemValues = z.input<typeof navItemSchema>;

const blankValues: NavItemValues = {
  site: 'MAIN',
  area: 'FOOTER',
  group_label: '',
  label: '',
  url: '',
  sort_order: 0,
  is_active: true,
};

interface Props {
  open: boolean;
  item: WebsiteNavItem | null;
  defaultSite: NavItemValues['site'];
  onClose: () => void;
  onSave: (values: NavItemValues) => Promise<void>;
}

/** Create/edit one navigation link for a marketing website. */
export default function NavItemDialog({ open, item, defaultSite, onClose, onSave }: Readonly<Props>) {
  const form = useForm<NavItemValues>({
    resolver: zodResolver(navItemSchema),
    defaultValues: blankValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      item
        ? {
            site: item.site,
            area: item.area,
            group_label: item.group_label,
            label: item.label,
            url: item.url,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }
        : { ...blankValues, site: defaultSite },
    );
  }, [open, item, defaultSite, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSave(values);
    onClose();
  });

  const selectField = (name: 'site' | 'area', label: string, options: { value: string; label: string }[]) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextField {...field} select label={label} size="small" fullWidth>
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{item ? 'Edit navigation link' : 'Add navigation link'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {selectField('site', 'Website', NAV_SITES)}
            {selectField('area', 'Area', NAV_AREAS.map((a) => ({ value: a, label: a })))}
          </Stack>
          <Controller
            control={form.control}
            name="group_label"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Group / column heading"
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? 'e.g. About, Community, Support — groups links together'}
              />
            )}
          />
          <Controller
            control={form.control}
            name="label"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Label"
                size="small"
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? 'Visible link text'}
              />
            )}
          />
          <Controller
            control={form.control}
            name="url"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="URL"
                size="small"
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? 'Site-relative (/about) or absolute (https://…)'}
              />
            )}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <Controller
              control={form.control}
              name="sort_order"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Sort order"
                  type="number"
                  size="small"
                  sx={{ maxWidth: 160 }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? 'Lower shows first'}
                />
              )}
            />
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Active"
                />
              )}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            submit().catch(() => undefined);
          }}
          disabled={form.formState.isSubmitting}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
