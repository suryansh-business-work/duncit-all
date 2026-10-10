import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_CAPTION_MAX,
  CHALLENGE_SUBMISSIONS_FOLDER,
  CHECKPOINT_PARAM,
  acceptedMediaTypes,
  allowsCaption,
  answerCount,
  buzzOrder,
  buzzRoundScope,
  challengeEntries,
  challengeItems,
  challengeQuestions,
  doneItemKeys,
  mediaTypeOfMime,
  openQuestion,
  parseCheckpointParam,
  pickedCompetitors,
  pollResults,
  toolsFedBy,
} from '../src/pod-challenge-tools';

const tool = (config: unknown, state: unknown = {}) => ({ config_json: JSON.stringify(config), state_json: JSON.stringify(state) });

describe('checklist and checkpoint items', () => {
  it('reads the tasks with their points, in order', () => {
    const items = challengeItems(tool({ items: [{ key: 'a', label: 'Warm up', points: 2 }, { key: 'b', label: 'Sprint', points: 5 }] }));
    expect(items).toEqual([
      { key: 'a', label: 'Warm up', points: 2 },
      { key: 'b', label: 'Sprint', points: 5 },
    ]);
  });

  it('reads malformed tasks as blanks instead of throwing', () => {
    expect(challengeItems(tool({ items: [null, 'x', { key: 7, label: null, points: 'many' }] }))).toEqual([{ key: '', label: '', points: 0 }]);
    expect(challengeItems(tool({ items: 'nope' }))).toEqual([]);
    expect(challengeItems({ config_json: 'not json' })).toEqual([]);
  });

  it('lists only what the asked competitor has done', () => {
    const state = tool({}, { done: { c1: ['a', 'b'], c2: ['a'] } });
    expect(doneItemKeys(state, 'c1')).toEqual(['a', 'b']);
    expect(doneItemKeys(state, 'c2')).toEqual(['a']);
    expect(doneItemKeys(state, 'c3')).toEqual([]);
  });

  it('treats a missing or malformed done map as nothing done', () => {
    expect(doneItemKeys(tool({}, {}), 'c1')).toEqual([]);
    expect(doneItemKeys(tool({}, { done: ['c1'] }), 'c1')).toEqual([]);
    expect(doneItemKeys(tool({}, { done: { c1: ['a', 4] } }), 'c1')).toEqual(['a']);
  });
});

describe('poll results', () => {
  const options = [{ key: 'x', label: 'Tea' }, { key: 'y', label: 'Coffee' }, { key: 'z', label: 'Water' }];

  it('pairs every option with its tally and share of the votes', () => {
    expect(pollResults(tool({ options }, { tallies: { x: 1, y: 2 }, total: 3 }))).toEqual([
      { key: 'x', label: 'Tea', votes: 1, percent: 33 },
      { key: 'y', label: 'Coffee', votes: 2, percent: 67 },
      { key: 'z', label: 'Water', votes: 0, percent: 0 },
    ]);
  });

  it('shows zero percent, not a division error, before anyone votes', () => {
    expect(pollResults(tool({ options }, {})).map((r) => r.percent)).toEqual([0, 0, 0]);
  });

  it('ignores a tally that is not a number', () => {
    expect(pollResults(tool({ options: [options[0]] }, { tallies: { x: 'lots' }, total: 4 }))).toEqual([
      { key: 'x', label: 'Tea', votes: 0, percent: 0 },
    ]);
  });
});

describe('quiz questions', () => {
  const questions = [
    { key: 'q1', label: '2 + 2?', options: ['3', '4'], correct: 1, points: 2 },
    { key: 'q2', label: 'Capital of France?', options: ['Paris', 'Rome'], points: 1 },
  ];

  it('keeps the correct answer in a host copy and reads null where the server stripped it', () => {
    const read = challengeQuestions(tool({ questions }));
    expect(read[0]).toEqual({ key: 'q1', label: '2 + 2?', options: ['3', '4'], correct: 1, points: 2 });
    expect(read[1].correct).toBeNull();
  });

  it('drops answers that are not text', () => {
    expect(challengeQuestions(tool({ questions: [{ key: 'q', label: 'Q', options: ['a', 2, null, 'b'] }] }))[0].options).toEqual(['a', 'b']);
    expect(challengeQuestions(tool({ questions: [{ key: 'q', label: 'Q', options: 'a,b' }] }))[0].options).toEqual([]);
  });

  it('finds the question the host opened', () => {
    expect(openQuestion(tool({ questions }, { active: 'q2' }))?.label).toBe('Capital of France?');
  });

  it('has no open question before one is opened, or when the key is unknown', () => {
    expect(openQuestion(tool({ questions }, { active: '' }))).toBeNull();
    expect(openQuestion(tool({ questions }, {}))).toBeNull();
    expect(openQuestion(tool({ questions }, { active: 'gone' }))).toBeNull();
  });

  it('counts the answers to one question', () => {
    const state = tool({}, { answered: { q1: 4 } });
    expect(answerCount(state, 'q1')).toBe(4);
    expect(answerCount(state, 'q2')).toBe(0);
    expect(answerCount(tool({}, {}), 'q1')).toBe(0);
  });
});

describe('buzzer and random picker', () => {
  it('reads the buzz order fastest first and the scope of the current round', () => {
    const state = tool({}, { round: 3, order: ['c2', 'c1'] });
    expect(buzzOrder(state)).toEqual(['c2', 'c1']);
    expect(buzzRoundScope(state)).toBe('r3');
  });

  it('starts at round zero with nobody buzzed', () => {
    expect(buzzOrder(tool({}, {}))).toEqual([]);
    expect(buzzRoundScope(tool({}, { round: Number.NaN }))).toBe('r0');
  });

  it('reads the picks oldest first', () => {
    expect(pickedCompetitors(tool({}, { picked: ['c3', 'c1'] }))).toEqual(['c3', 'c1']);
    expect(pickedCompetitors(tool({}, { picked: null }))).toEqual([]);
  });
});

describe('submissions', () => {
  it('reads the gallery and leaves out an entry of an unknown media type', () => {
    const entries = [
      { id: 'e1', competitor_id: 'c1', media_url: 'https://m/1.jpg', media_type: 'IMAGE', caption: 'Mine' },
      { id: 'e2', competitor_id: 'c2', media_url: 'https://m/2.pdf', media_type: 'PDF', caption: '' },
      { id: 'e3', competitor_id: 'c3', media_url: 'https://m/3.mp4', media_type: 'VIDEO' },
    ];
    expect(challengeEntries(tool({}, { entries }))).toEqual([
      { id: 'e1', competitor_id: 'c1', media_url: 'https://m/1.jpg', media_type: 'IMAGE', caption: 'Mine' },
      { id: 'e3', competitor_id: 'c3', media_url: 'https://m/3.mp4', media_type: 'VIDEO', caption: '' },
    ]);
    expect(challengeEntries(tool({}, {}))).toEqual([]);
  });

  it('accepts the one kind a host fixed, or all three', () => {
    expect(acceptedMediaTypes(tool({ media_kind: 'VIDEO' }))).toEqual(['VIDEO']);
    expect(acceptedMediaTypes(tool({ media_kind: 'ANY' }))).toEqual(['IMAGE', 'VIDEO', 'AUDIO']);
    expect(acceptedMediaTypes(tool({}))).toEqual(['IMAGE', 'VIDEO', 'AUDIO']);
  });

  it('allows a caption unless the host switched it off', () => {
    expect(allowsCaption(tool({}))).toBe(true);
    expect(allowsCaption(tool({ allow_caption: true }))).toBe(true);
    expect(allowsCaption(tool({ allow_caption: false }))).toBe(false);
  });

  it('maps a picked file to its submission kind by MIME family', () => {
    expect(mediaTypeOfMime('image/png')).toBe('IMAGE');
    expect(mediaTypeOfMime('video/mp4')).toBe('VIDEO');
    expect(mediaTypeOfMime('audio/mpeg')).toBe('AUDIO');
  });

  it('refuses a file a challenge cannot take', () => {
    expect(mediaTypeOfMime('application/pdf')).toBeNull();
    expect(mediaTypeOfMime('')).toBeNull();
    expect(mediaTypeOfMime(null)).toBeNull();
    expect(mediaTypeOfMime(undefined)).toBeNull();
  });

  it('caps captions at the length the server keeps', () => {
    expect(CHALLENGE_CAPTION_MAX).toBe(200);
  });

  it('uploads to the folder the server routes to the uploader', () => {
    expect(CHALLENGE_SUBMISSIONS_FOLDER).toBe('/challenge-submissions');
  });
});

describe('checkpoint links', () => {
  it('names the parameter the QR link carries', () => {
    expect(CHECKPOINT_PARAM).toBe('checkpoint');
  });

  it('splits the tool from the code', () => {
    expect(parseCheckpointParam('tool1.abc123')).toEqual({ toolInstanceId: 'tool1', code: 'abc123' });
  });

  it('takes the code after the last dot when the tool id has dots of its own', () => {
    expect(parseCheckpointParam('a.b.c0de')).toEqual({ toolInstanceId: 'a.b', code: 'c0de' });
  });

  it('rejects a value with no tool, no code or no separator', () => {
    expect(parseCheckpointParam('.code')).toBeNull();
    expect(parseCheckpointParam('tool.')).toBeNull();
    expect(parseCheckpointParam('toolcode')).toBeNull();
    expect(parseCheckpointParam('')).toBeNull();
    expect(parseCheckpointParam(null)).toBeNull();
    expect(parseCheckpointParam(undefined)).toBeNull();
  });
});

describe('toolsFedBy', () => {
  const tools = [
    { input_kind: 'POLL', id: 1 },
    { input_kind: 'QUIZ', id: 2 },
    { input_kind: 'CHECK', id: 3 },
    { input_kind: 'CHECKPOINT', id: 4 },
  ];

  it('keeps the tools fed any of the asked ways, in their own order', () => {
    expect(toolsFedBy(tools, 'CHECKPOINT', 'CHECK').map((t) => t.id)).toEqual([3, 4]);
    expect(toolsFedBy(tools, 'QUIZ').map((t) => t.id)).toEqual([2]);
  });

  it('is empty when no tool is fed that way', () => {
    expect(toolsFedBy(tools, 'BUZZ')).toEqual([]);
  });
});
