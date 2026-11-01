import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import CollaboratorsField from '../../src/components/CollaboratorsField';
import { COLLABORATOR_CAP, collaboratorsSchema, normalizeHandle, uniqueHandles } from '../../src/components/collaborators';
import { PUBLISH_RULES } from '../../src/pages/social-accounts-page/social-post-form';

const translator = () => renderHook(() => useTranslation()).result.current.t;

describe('collaborator rules', () => {
  it('caps at the Instagram API limit, and no other network takes collaborators', () => {
    expect(COLLABORATOR_CAP).toBe(3);
    expect(PUBLISH_RULES.INSTAGRAM.maxCollaborators).toBe(3);
    for (const platform of ['FACEBOOK', 'THREADS', 'YOUTUBE', 'LINKEDIN', 'X'] as const) {
      expect(PUBLISH_RULES[platform].maxCollaborators).toBe(0);
    }
  });

  it('drops every leading @, surrounding spaces and case', () => {
    expect(normalizeHandle('  @@Blue.Cafe ')).toBe('blue.cafe');
    expect(normalizeHandle('run_club')).toBe('run_club');
    expect(normalizeHandle(' @ ')).toBe('');
  });

  it('keeps each handle once, in the order typed, without blanks', () => {
    expect(uniqueHandles(['@b', 'a', 'B', '', '@'])).toEqual(['b', 'a']);
  });

  it('accepts up to the cap of valid usernames and explains each refusal', () => {
    const schema = collaboratorsSchema(translator());
    expect(schema.safeParse([]).success).toBe(true);
    expect(schema.safeParse(['a.b', 'c_d', 'e3']).success).toBe(true);
    const tooMany = schema.safeParse(['a', 'b', 'c', 'd']);
    expect(tooMany.success).toBe(false);
    expect(tooMany.error?.issues[0].message).toBe('Instagram takes at most 3 collaborators on a post');
    const invalid = schema.safeParse(['dun..cit']);
    expect(invalid.error?.issues[0].message).toMatch(/must be an Instagram username/);
  });
});

function Harness({ initial, onChange }: Readonly<{ initial: string[]; onChange: (handles: string[]) => void }>) {
  const [value, setValue] = useState(initial);
  return (
    <CollaboratorsField
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      testId="collab"
    />
  );
}

const input = () => within(screen.getByTestId('collab')).getByRole('combobox');

describe('CollaboratorsField', () => {
  it('adds a typed handle as a clean chip and says the cap', () => {
    const onChange = vi.fn();
    render(<Harness initial={[]} onChange={onChange} />);
    expect(screen.getByText(/Up to 3 accounts are invited as collaborators/)).toBeInTheDocument();
    expect(input()).toHaveAttribute('placeholder', 'Type an Instagram username and press Enter');
    fireEvent.change(input(), { target: { value: '@Asha_Runs' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['asha_runs']);
    expect(screen.getByText('asha_runs')).toBeInTheDocument();
  });

  it('collapses a duplicate and stops prompting once the cap is reached', () => {
    const onChange = vi.fn();
    render(<Harness initial={['a', 'b']} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '@A' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    fireEvent.change(input(), { target: { value: 'c' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    expect(input()).not.toHaveAttribute('placeholder');
  });

  it('shows a validation message instead of the hint, and a custom hint when given', () => {
    const { rerender } = render(<CollaboratorsField value={[]} onChange={vi.fn()} error="Not a username" testId="collab" />);
    expect(screen.getByText('Not a username')).toBeInTheDocument();
    expect(screen.queryByText(/Up to 3 accounts/)).not.toBeInTheDocument();
    rerender(<CollaboratorsField value={[]} onChange={vi.fn()} hint="Venue and host by default" testId="collab" />);
    expect(screen.getByText('Venue and host by default')).toBeInTheDocument();
  });
});
