import { useEffect, useRef, useState } from 'react';
import { Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/shell';
import OwnEntryForm from './own-entry.form';
import type { OwnEntryProps } from './own-entry.types';

/**
 * The "+" chip at the end of a chip list. Pressed, it becomes the input that
 * adds an entry of the venue's own; once that closes, focus comes back here.
 */
export default function OwnEntry(props: Readonly<OwnEntryProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open && wasOpen.current) chipRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (open) {
    const add = (entry: string) => {
      props.onAdd(entry);
      setOpen(false);
    };
    return <OwnEntryForm {...props} testId={`${props.testId}-form`} onAdd={add} onClose={() => setOpen(false)} />;
  }
  return (
    <Chip
      ref={chipRef}
      icon={<AddIcon />}
      label={t('partners.registerVenuePage.addOwnEntry')}
      variant="outlined"
      clickable
      onClick={() => setOpen(true)}
      aria-label={t('partners.registerVenuePage.addOwnEntryTo', { vars: { group: props.groupLabel } })}
      data-testid={props.testId}
    />
  );
}
