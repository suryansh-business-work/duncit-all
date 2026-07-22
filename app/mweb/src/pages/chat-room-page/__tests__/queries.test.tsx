import { describe, it, expect } from 'vitest';
import {
  POD_MESSAGES,
  CHAT_PARTICIPANTS,
  SEND_MSG,
  REACT_MSG,
  EMOJIS,
} from '../queries';

function operationName(doc: { definitions: readonly unknown[] }): string {
  const def = doc.definitions[0] as {
    kind: string;
    name?: { value: string };
    operation?: string;
  };
  expect(def.kind).toBe('OperationDefinition');
  return def.name?.value ?? '';
}

describe('chat-room-page queries module', () => {
  it('exposes POD_MESSAGES query with the expected fields', () => {
    expect(operationName(POD_MESSAGES)).toBe('PodMessages');
    const printed = JSON.stringify(POD_MESSAGES);
    expect(printed).toContain('podMessages');
    expect(printed).toContain('reactions');
    expect(printed).toContain('pod_end_date_time');
    expect(printed).toContain('club_slug');
  });

  it('exposes CHAT_PARTICIPANTS query with hosts and participants', () => {
    expect(operationName(CHAT_PARTICIPANTS)).toBe('ChatParticipants');
    const printed = JSON.stringify(CHAT_PARTICIPANTS);
    expect(printed).toContain('chatParticipants');
    expect(printed).toContain('participant_count');
    expect(printed).toContain('hosts');
    expect(printed).toContain('participants');
  });

  it('exposes SEND_MSG mutation named Send', () => {
    const def = SEND_MSG.definitions[0] as { operation?: string };
    expect(def.operation).toBe('mutation');
    expect(operationName(SEND_MSG)).toBe('Send');
    expect(JSON.stringify(SEND_MSG)).toContain('sendPodMessage');
  });

  it('exposes REACT_MSG mutation named React returning reactions', () => {
    const def = REACT_MSG.definitions[0] as { operation?: string };
    expect(def.operation).toBe('mutation');
    expect(operationName(REACT_MSG)).toBe('React');
    const printed = JSON.stringify(REACT_MSG);
    expect(printed).toContain('reactToPodMessage');
    expect(printed).toContain('emoji');
  });

  it('provides a stable, non-empty list of emoji options with no duplicates', () => {
    expect(Array.isArray(EMOJIS)).toBe(true);
    expect(EMOJIS.length).toBe(8);
    expect(EMOJIS).toContain('👍');
    expect(EMOJIS).toContain('❤️');
    expect(new Set(EMOJIS).size).toBe(EMOJIS.length);
    EMOJIS.forEach((e) => expect(typeof e).toBe('string'));
  });
});
