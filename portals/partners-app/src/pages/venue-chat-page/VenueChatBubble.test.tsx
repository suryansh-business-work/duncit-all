import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueChatThread from './VenueChatThread';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { at, line, ownLine } from '../../__tests__/venue-chat-fixtures';

afterEach(cleanup);

const SUBJECT = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };
const PHOTO = ownLine('p1', { type: 'IMAGE', text: '', image_url: 'https://img.test/hall.jpg', createdAt: at(3) });

/** The owner's (u-venue) thread: the host's question, their answer and a photo they sent. */
const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueChatThread podId="pod-1" side="VENUE" subject={SUBJECT} marks={[]} />, {
    link: scriptedLink(
      {
        VenueChatMessages: { venueChatMessages: [line('t1'), ownLine('o1'), PHOTO] },
        PodVenueOfferTerms: { podVenueOffer: null },
        MarkVenueChatRead: { markVenueChatRead: true },
        ...answers,
      },
      sent,
    ),
    user: partnerUser({ user_id: 'u-venue' }),
  });

const editDialog = () => within(screen.getByRole('dialog', { name: 'Edit message' }));
const deleteDialog = () => within(screen.getByRole('dialog', { name: 'Delete this message?' }));

describe('VenueChatBubble — what the owner may do to a line', () => {
  it('offers Edit and Delete on their own text, Delete alone on their photo, and neither on the host’s line', async () => {
    mount();
    expect(await screen.findByTestId('venue-chat-edit-o1')).toBeTruthy();
    expect(screen.getByTestId('venue-chat-delete-o1')).toBeTruthy();
    expect(screen.getByTestId('venue-chat-delete-p1')).toBeTruthy();
    expect(screen.queryByTestId('venue-chat-edit-p1')).toBeNull();
    expect(screen.queryByTestId('venue-chat-edit-t1')).toBeNull();
    expect(screen.queryByTestId('venue-chat-delete-t1')).toBeNull();
  });
});

describe('VenueChatBubble — editing their own line', () => {
  it('rewrites the line from what it says now, and shows it edited', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        EditVenueChatMessage: (variables) => ({
          editVenueChatMessage: ownLine('o1', { text: variables.text, edited_at: at(6) }),
        }),
      },
      sent,
    );
    fireEvent.click(await screen.findByTestId('venue-chat-edit-o1'));
    const box = editDialog().getByRole('textbox', { name: 'Edit message' });
    expect((box as HTMLTextAreaElement).value).toBe('Yes, from 6 pm.');

    fireEvent.change(box, { target: { value: '  Yes, from 7 pm.  ' } });
    fireEvent.click(screen.getByTestId('venue-chat-edit-save'));

    await waitFor(() =>
      expect(sent.find((op) => op.name === 'EditVenueChatMessage')?.variables).toEqual({ message_id: 'o1', text: 'Yes, from 7 pm.' }),
    );
    expect(await screen.findByText('Yes, from 7 pm.')).toBeTruthy();
    expect(screen.queryByText('Yes, from 6 pm.')).toBeNull();
    expect(screen.getByText('Yes, from 7 pm.').closest('li')?.textContent).toContain(' · Edited');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('asks for something to say before it sends anything', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    fireEvent.click(await screen.findByTestId('venue-chat-edit-o1'));
    fireEvent.change(editDialog().getByRole('textbox', { name: 'Edit message' }), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('venue-chat-edit-save'));

    expect(await editDialog().findByText('Write something first')).toBeTruthy();
    expect(sent.some((op) => op.name === 'EditVenueChatMessage')).toBe(false);
  });

  it('keeps the dialog open and the line as it was when the server refuses, saying why', async () => {
    mount({ EditVenueChatMessage: new Error('This message can no longer be edited') });
    fireEvent.click(await screen.findByTestId('venue-chat-edit-o1'));
    fireEvent.change(editDialog().getByRole('textbox', { name: 'Edit message' }), { target: { value: 'Yes, from 7 pm.' } });
    fireEvent.click(screen.getByTestId('venue-chat-edit-save'));

    // Said inside the dialog the owner is looking at (and in the thread's notice behind it).
    expect(await editDialog().findByText('This message can no longer be edited')).toBeTruthy();
    expect(editDialog().getByRole('textbox', { name: 'Edit message' })).toBeTruthy();
    expect(screen.getByText('Yes, from 6 pm.')).toBeTruthy();

    fireEvent.click(editDialog().getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('VenueChatBubble — deleting their own line', () => {
  it('asks first, and leaves the line when the owner thinks better of it', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    fireEvent.click(await screen.findByTestId('venue-chat-delete-o1'));
    expect(deleteDialog().getByText('It is removed from the chat for both sides.')).toBeTruthy();

    fireEvent.click(deleteDialog().getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Yes, from 6 pm.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'DeleteVenueChatMessage')).toBe(false);
  });

  it('takes the photo off the thread once the server removes it', async () => {
    const sent: SentOperation[] = [];
    mount({ DeleteVenueChatMessage: { deleteVenueChatMessage: true } }, sent);
    expect(await screen.findByRole('img', { name: 'Photo from You' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('venue-chat-delete-p1'));
    fireEvent.click(deleteDialog().getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('img', { name: 'Photo from You' })).toBeNull());
    expect(sent.find((op) => op.name === 'DeleteVenueChatMessage')?.variables).toEqual({ message_id: 'p1' });
    expect(screen.getByText('Yes, from 6 pm.')).toBeTruthy();
    expect(screen.getByText('Is the terrace free?')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the line and says why when the server refuses', async () => {
    mount({ DeleteVenueChatMessage: new Error('Only its author can delete this message') });
    fireEvent.click(await screen.findByTestId('venue-chat-delete-o1'));
    fireEvent.click(deleteDialog().getByRole('button', { name: 'Delete' }));

    expect(await deleteDialog().findByText('Only its author can delete this message')).toBeTruthy();
    expect(screen.getByText('Yes, from 6 pm.')).toBeTruthy();
  });
});
