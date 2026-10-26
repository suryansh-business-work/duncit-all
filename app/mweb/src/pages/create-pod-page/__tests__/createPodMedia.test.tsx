import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import MediaUrlsField from '../create-pod/fields/MediaUrlsField';
import { fallbackT } from '../../../i18n/fallback';

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: (p: { open: boolean; max: number; onPicked: (u: string) => void; onPickedMany: (u: string[]) => void; onClose: () => void }) =>
    p.open ? (
      <div data-testid="picker" data-max={p.max}>
        <button data-testid="pick-many" onClick={() => p.onPickedMany(['https://img/a.png', 'https://img/b.png'])} />
        <button data-testid="pick-dupes" onClick={() => p.onPickedMany(['https://img/a.png'])} />
        <button data-testid="close-picker" onClick={p.onClose} />
      </div>
    ) : null,
}));

function Harness({ initial = '', maxImages, onChange }: Readonly<{ initial?: string; maxImages?: number; onChange?: (v: string) => void }>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MediaUrlsField
        value={value}
        onChange={(next) => {
          onChange?.(next);
          setValue(next);
        }}
        maxImages={maxImages}
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('MediaUrlsField batches', () => {
  it('adds every picked image in one change', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('media-upload-add'));
    fireEvent.click(screen.getByTestId('pick-many'));
    expect(screen.getByTestId('value').textContent).toBe('https://img/a.png\nhttps://img/b.png');
  });

  it('adds nothing when everything picked is already there', () => {
    const onChange = vi.fn();
    render(<Harness initial="https://img/a.png" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('media-upload-add'));
    fireEvent.click(screen.getByTestId('pick-dupes'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('close-picker'));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('treats a missing value as no media', () => {
    render(<MediaUrlsField value={undefined as never} onChange={vi.fn()} />);
    expect(screen.getByTestId('media-upload-add')).toHaveAccessibleName(fallbackT('mweb.createPod.uploadImage'));
  });

  it('stops offering more once the ceiling is reached, and says so', () => {
    const onChange = vi.fn();
    render(<Harness initial={'https://img/a.png\nhttps://img/b.png'} maxImages={2} onChange={onChange} />);
    expect(screen.getByText(fallbackT('mweb.createPod.mediaMaxHint', { vars: { max: 2 } }))).toBeInTheDocument();
    const add = screen.getByTestId('media-upload-add');
    fireEvent.click(add);
    fireEvent.keyDown(add, { key: 'Enter' });
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('opens the picker from the add tile with the keyboard, limited to the room left', () => {
    render(<Harness initial="https://img/a.png" maxImages={3} />);
    const add = screen.getByTestId('media-upload-add');
    fireEvent.keyDown(add, { key: 'x' });
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    fireEvent.keyDown(add, { key: ' ' });
    expect(screen.getByTestId('picker')).toHaveAttribute('data-max', '2');
  });
});
