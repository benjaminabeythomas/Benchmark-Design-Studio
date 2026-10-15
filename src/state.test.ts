import { describe, expect, it } from 'vitest';
import { applyPrompt, HistoryStore, initialState, validateState } from './state';

const fresh = () => validateState(initialState);

describe('validateState', () => {
  it('copies valid data without retaining mutable references', () => {
    const state = fresh();
    state.opened.drawer = true;
    const copy = validateState(state);
    copy.island.width = 3;
    copy.opened.drawer = false;
    expect(state.island.width).toBe(2.2);
    expect(state.opened.drawer).toBe(true);
  });

  it.each([null, [], {}, { ...initialState, room: 'bedroom' }, { ...initialState, material: 'marble' },
    { ...initialState, style: 'industrial' }, { ...initialState, lights: 'on' },
    { ...initialState, opened: { drawer: 1 } }, { ...initialState, island: { ...initialState.island, enabled: 1 } },
    { ...initialState, opened: JSON.parse('{"__proto__":true}') }])('rejects malformed scene data %#', input => {
    expect(() => validateState(input)).toThrow();
  });

  it.each([
    ['width', 0.79], ['width', 3.51], ['depth', 0.49], ['depth', 1.61], ['height', 0.64], ['height', 1.21],
    ['width', NaN], ['width', Infinity], ['width', '2.2'], ['width', null],
  ])('rejects invalid %s %s', (dimension, value) => {
    expect(() => validateState({ ...initialState, island: { ...initialState.island, [dimension]: value } })).toThrow();
  });

  it('accepts every dimension boundary', () => {
    expect(() => validateState({ ...initialState, island: { enabled: true, width: 0.8, depth: 0.5, height: 0.65 } })).not.toThrow();
    expect(() => validateState({ ...initialState, island: { enabled: true, width: 3.5, depth: 1.6, height: 1.2 } })).not.toThrow();
  });
});

describe('applyPrompt', () => {
  it.each(['walnut cabinets', 'make the cabinets walnut', 'change cabinet material to walnut', 'use walnut'])('supports material phrase %s', text => {
    expect(applyPrompt(fresh(), text).state.material).toBe('walnut');
  });

  it.each(['oak', 'walnut', 'sage', 'ivory', 'charcoal'])('supports %s cabinet material', text => {
    expect(applyPrompt(fresh(), `${text} cabinets`).state.material).toBe(text);
  });

  it.each(['warm', 'minimal', 'moody'])('supports %s style', style => {
    expect(applyPrompt(fresh(), `use ${style} style`).state.style).toBe(style);
    expect(applyPrompt(fresh(), `make it ${style}`).state.style).toBe(style);
  });

  it('switches room and clears front states belonging to the previous room', () => {
    const state = fresh();
    state.opened.drawer = true;
    const result = applyPrompt(state, 'switch to bathroom');
    expect(result.state.room).toBe('bathroom');
    expect(result.state.opened).toEqual({});
    expect(applyPrompt(result.state, 'kitchen').state.room).toBe('kitchen');
  });

  it.each(['remove the island', 'hide island', 'delete the kitchen island'])('removes island with %s', text => {
    expect(applyPrompt(fresh(), text).state.island.enabled).toBe(false);
  });

  it('adds the island and keeps previously configured dimensions', () => {
    const state = fresh();
    state.island.enabled = false;
    state.island.width = 2.7;
    expect(applyPrompt(state, 'add an island').state.island).toEqual({ ...state.island, enabled: true });
  });

  it.each([
    ['set island width to 240 cm', 'width', 2.4],
    ['make the island 2.4 meters wide', 'width', 2.4],
    ['island depth 100 centimetres', 'depth', 1],
    ['adjust island height to 95cm', 'height', 0.95],
    ['island .8m wide', 'width', 0.8],
  ])('resizes with %s', (text, dimension, value) => {
    expect(applyPrompt(fresh(), text as string).state.island[dimension as 'width' | 'depth' | 'height']).toBe(value);
  });

  it('supports multiple named dimensions and width × depth × height', () => {
    expect(applyPrompt(fresh(), 'make island 240cm wide and 100cm deep').state.island).toMatchObject({ width: 2.4, depth: 1 });
    expect(applyPrompt(fresh(), 'set island width to 2.4m, depth to 1m and height to 95cm').state.island).toMatchObject({ width: 2.4, depth: 1, height: 0.95 });
    expect(applyPrompt(fresh(), 'set island dimensions to 240cm x 100cm x 95cm').state.island).toMatchObject({ width: 2.4, depth: 1, height: 0.95 });
  });

  it.each(['lights off', 'turn off the lights', 'switch lighting off', 'disable lighting'])('turns lights off with %s', text => {
    expect(applyPrompt(fresh(), text).state.lights).toBe(false);
  });

  it('turns lights back on', () => {
    expect(applyPrompt({ ...fresh(), lights: false }, 'turn lights on').state.lights).toBe(true);
  });

  it('opens/closes existing front IDs and the wildcard for subsequently rendered fronts', () => {
    const state = fresh();
    state.opened = { 'cabinet-1': false, drawer: true };
    const opened = applyPrompt(state, 'open all cupboards').state;
    expect(opened.opened).toEqual({ 'cabinet-1': true, drawer: true, '*': true });
    expect(applyPrompt(opened, 'close all doors').state.opened).toEqual({ 'cabinet-1': false, drawer: false, '*': false });
    expect(applyPrompt(state, 'open all drawers').state.opened['*']).toBe(true);
  });

  it('applies explicit compound commands atomically and does not mutate its input', () => {
    const state = fresh();
    const before = fresh();
    const result = applyPrompt(state, 'Please make the cabinets walnut and turn lights off; set island width to 240cm.');
    expect(result.state).toMatchObject({ material: 'walnut', lights: false, island: { width: 2.4 } });
    expect(state).toEqual(before);
  });

  it.each([
    'make it beautiful', 'add a swimming pool', 'do not remove the island', 'can you explain walnut cabinets',
    'walnut cabinets and add a pool', 'set island width to 2..4m', 'set island width to 240',
    'set island width to 2,4m', 'set island width to Infinity m', 'set island width to -2m',
    'set island width to 4m', 'set island depth to .2m', 'set island height to 2m',
    'set island width to 2.4m and height to 2m', 'set island width to 2m and width to 3m',
    'walnut cabinets and set island width to 4m', 'set island width to 2.4m trailing nonsense',
  ])('does not partially apply unsupported/invalid command %s', text => {
    const state = fresh();
    const result = applyPrompt(state, text);
    expect(result.state).toBe(state);
    expect(result.message).toContain('No changes made');
  });

  it('explains missing input and dimension limits', () => {
    expect(applyPrompt(fresh(), ' ').message).toContain('Try');
    expect(applyPrompt(fresh(), 'set island width to 5m').message).toContain('0.8 and 3.5 m');
    expect(applyPrompt(fresh(), 'set island width to 5').message).toContain('m or cm');
  });

  it('returns the existing snapshot for a no-op', () => {
    const state = fresh();
    expect(applyPrompt(state, 'oak cabinets').state).toBe(state);
  });
});

describe('HistoryStore', () => {
  it('supports undo/redo and safe boundary calls', () => {
    const history = new HistoryStore();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toEqual(initialState);
    history.commit(applyPrompt(history.state, 'walnut cabinets').state);
    history.commit(applyPrompt(history.state, 'lights off').state);
    expect(history.canUndo).toBe(true);
    expect(history.undo()).toMatchObject({ material: 'walnut', lights: true });
    expect(history.canRedo).toBe(true);
    expect(history.undo()).toEqual(initialState);
    expect(history.redo()).toMatchObject({ material: 'walnut', lights: true });
    expect(history.redo()).toMatchObject({ material: 'walnut', lights: false });
    expect(history.redo()).toMatchObject({ material: 'walnut', lights: false });
    expect(history.canRedo).toBe(false);
  });

  it('drops redo only for a new change and does not record duplicate commits', () => {
    const history = new HistoryStore();
    history.commit(applyPrompt(history.state, 'walnut cabinets').state);
    history.undo();
    history.commit(history.state);
    expect(history.canRedo).toBe(true);
    history.commit(applyPrompt(history.state, 'sage cabinets').state);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toEqual(initialState);
    expect(history.canUndo).toBe(false);
  });

  it('isolates constructor input, commits, returned state and undo snapshots', () => {
    const input = fresh();
    const history = new HistoryStore(input);
    input.island.width = 3;
    const read = history.state;
    read.island.width = 3.1;
    read.opened.test = true;
    expect(history.state).toEqual(initialState);
    const next = applyPrompt(history.state, 'walnut cabinets').state;
    history.commit(next);
    next.material = 'sage';
    history.undo().island.width = 3.2;
    expect(history.state).toEqual(initialState);
    expect(history.redo().material).toBe('walnut');
  });

  it('rejects an invalid commit without damaging history', () => {
    const history = new HistoryStore();
    expect(() => history.commit({ ...fresh(), island: { ...initialState.island, width: 100 } })).toThrow();
    expect(history.state).toEqual(initialState);
    expect(history.canUndo).toBe(false);
  });
});
