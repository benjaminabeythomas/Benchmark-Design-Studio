export type Room = 'kitchen' | 'bathroom';
export type MaterialKey = 'oak' | 'walnut' | 'sage' | 'ivory' | 'charcoal';

export interface SceneState {
  room: Room;
  style: 'warm' | 'minimal' | 'moody';
  material: MaterialKey;
  island: { enabled: boolean; width: number; depth: number; height: number };
  lights: boolean;
  /** An explicit front ID overrides '*', the open/close-all fallback. */
  opened: Record<string, boolean>;
}

export const initialState: SceneState = {
  room: 'kitchen',
  style: 'warm',
  material: 'oak',
  island: { enabled: true, width: 2.2, depth: 0.9, height: 0.9 },
  lights: true,
  opened: {},
};

const limits = { width: [0.8, 3.5], depth: [0.5, 1.6], height: [0.65, 1.2] } as const;
type Dimension = keyof typeof limits;
const materials: MaterialKey[] = ['oak', 'walnut', 'sage', 'ivory', 'charcoal'];
const help = 'Try “walnut cabinets”, “add an island”, “set island width to 240 cm”, “lights off”, “open all doors”, “bathroom”, or “minimal style”.';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function validateDimension(name: Dimension, value: unknown): number {
  const [min, max] = limits[name];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Island ${name} must be between ${min} and ${max} m.`);
  }
  return value;
}

/** Validate and defensively copy persisted or imported scene data. */
export function validateState(input: unknown): SceneState {
  if (!record(input)) throw new Error('Scene data must be an object.');
  if (input.room !== 'kitchen' && input.room !== 'bathroom') throw new Error('Choose a kitchen or bathroom.');
  if (input.style !== 'warm' && input.style !== 'minimal' && input.style !== 'moody') throw new Error('Unknown room style.');
  if (!materials.includes(input.material as MaterialKey)) throw new Error('Unknown cabinet material.');
  if (!record(input.island) || typeof input.island.enabled !== 'boolean') throw new Error('Invalid island settings.');
  if (typeof input.lights !== 'boolean') throw new Error('Lights must be on or off.');
  if (!record(input.opened)) throw new Error('Invalid door and drawer settings.');
  const opened: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(input.opened)) {
    if (typeof value !== 'boolean' || ['__proto__', 'prototype', 'constructor'].includes(id)) {
      throw new Error('Invalid door or drawer state.');
    }
    opened[id] = value;
  }
  return {
    room: input.room,
    style: input.style,
    material: input.material as MaterialKey,
    island: {
      enabled: input.island.enabled,
      width: validateDimension('width', input.island.width),
      depth: validateDimension('depth', input.island.depth),
      height: validateDimension('height', input.island.height),
    },
    lights: input.lights,
    opened,
  };
}

interface Command { apply: (state: SceneState) => void; message: string }
const number = '(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
const unit = '(cm|centimeters?|centimetres?|m|meters?|metres?)';
const measure = `${number}\\s*${unit}`;
const byName = new RegExp(`^(width|depth|height)\\s*(?:(?:to|of|is)\\s*|=\\s*)?${measure}$`);
const byAdjective = new RegExp(`^${measure}\\s*(wide|deep|high|tall)$`);

function metres(value: string, units: string): number {
  const n = Number(value);
  return units.startsWith('c') ? n / 100 : n;
}

function dimensionCommand(text: string): Command | undefined {
  const prefix = /^(?:(?:set|make|change|resize|adjust)\s+)?(?:the\s+)?island\s+/;
  if (!prefix.test(text)) return undefined;
  let rest = text.replace(prefix, '').replace(/^(?:dimensions?\s+)?(?:to\s+)?/, '');
  const values: Partial<Record<Dimension, number>> = {};
  const triple = new RegExp(`^${measure}\\s*(?:x|×|by)\\s*${measure}(?:\\s*(?:x|×|by)\\s*${measure})?$`).exec(rest);
  if (triple) {
    values.width = metres(triple[1], triple[2]);
    values.depth = metres(triple[3], triple[4]);
    if (triple[5]) values.height = metres(triple[5], triple[6]);
  } else {
    rest = rest.replace(/,\s*and\s+/g, ' and ');
    const parts = rest.split(/\s+and\s+|\s*,\s*/);
    for (const part of parts) {
      let name: Dimension;
      let value: number;
      const named = byName.exec(part);
      const described = byAdjective.exec(part);
      if (named) {
        name = named[1] as Dimension;
        value = metres(named[2], named[3]);
      } else if (described) {
        name = ({ wide: 'width', deep: 'depth', high: 'height', tall: 'height' } as const)[described[3] as 'wide' | 'deep' | 'high' | 'tall'];
        value = metres(described[1], described[2]);
      } else {
        return undefined;
      }
      if (name in values) throw new Error(`Specify the island ${name} only once.`);
      values[name] = value;
    }
  }
  for (const [name, value] of Object.entries(values)) validateDimension(name as Dimension, value);
  return {
    apply: state => { Object.assign(state.island, values); },
    message: `Island ${Object.entries(values).map(([name, value]) => `${name} set to ${value} m`).join(', ')}.`,
  };
}

function parseCommand(text: string): Command | undefined {
  let match: RegExpExecArray | null;
  const dimension = dimensionCommand(text);
  if (dimension) return dimension;

  match = /^(?:(?:switch|change|set)(?: the room)? to |(?:show|create|design|use) (?:a |the )?)?(kitchen|bathroom)(?: room)?$/.exec(text);
  if (match) {
    const room = match[1] as Room;
    return { apply: state => { state.room = room; state.opened = {}; }, message: `Switched to the ${room}.` };
  }

  match = /^(?:(?:use|apply) (?:a |the )?|(?:make|set|change) (?:it|the room|the style|the look)(?: to)? )?(warm|minimal|moody)(?: style| look)?$/.exec(text);
  if (match) {
    const style = match[1] as SceneState['style'];
    return { apply: state => { state.style = style; }, message: `Applied the ${style} style.` };
  }

  match = /^(?:(?:make|set|change|paint) (?:the )?(?:cabinets?|cupboards?|cabinet material|cabinet finish|material|finish)(?: to| in)? |(?:use|apply) )?(oak|walnut|sage|ivory|charcoal)(?: (?:cabinets?|cupboards?|cabinet material|cabinet finish|material|finish))?$/.exec(text);
  if (match) {
    const material = match[1] as MaterialKey;
    return { apply: state => { state.material = material; }, message: `Cabinets updated to ${material}.` };
  }

  match = /^(?:(?:turn|switch) )?(?:the )?(?:lights?|lighting) (on|off)$/.exec(text)
    ?? /^(?:turn|switch) (on|off) (?:the )?(?:lights?|lighting)$/.exec(text);
  if (match) {
    const on = match[1] === 'on';
    return { apply: state => { state.lights = on; }, message: `Lights turned ${on ? 'on' : 'off'}.` };
  }
  match = /^(enable|disable) (?:the )?(?:lights?|lighting)$/.exec(text);
  if (match) {
    const on = match[1] === 'enable';
    return { apply: state => { state.lights = on; }, message: `Lights turned ${on ? 'on' : 'off'}.` };
  }

  match = /^(open|close) (?:(?:all|the|all the) )?(?:doors?|cupboards?|drawers?|cabinets?|everything)$/.exec(text);
  if (match) {
    const open = match[1] === 'open';
    return {
      apply: state => {
        state.opened = Object.fromEntries(Object.keys(state.opened).map(id => [id, open]));
        state.opened['*'] = open;
      },
      message: `${open ? 'Opened' : 'Closed'} all doors and drawers.`,
    };
  }

  match = /^(add|remove|delete|hide|show|enable|disable) (?:a |an |the )?(?:kitchen )?island$/.exec(text);
  if (match) {
    const enabled = ['add', 'show', 'enable'].includes(match[1]);
    return { apply: state => { state.island.enabled = enabled; }, message: `Island ${enabled ? 'added' : 'removed'}.` };
  }
  return undefined;
}

function equal(a: SceneState, b: SceneState): boolean {
  return a.room === b.room && a.style === b.style && a.material === b.material
    && a.lights === b.lights && a.island.enabled === b.island.enabled
    && a.island.width === b.island.width && a.island.depth === b.island.depth
    && a.island.height === b.island.height
    && Object.keys(a.opened).length === Object.keys(b.opened).length
    && Object.entries(a.opened).every(([key, value]) => b.opened[key] === value);
}

/** A deliberately bounded, deterministic command parser, with atomic multi-command edits. */
export function applyPrompt(state: SceneState, text: string): { state: SceneState; message: string } {
  const next = validateState(state);
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/^please\s+/, '').replace(/[.!?]+$/, '').replace(/,?\s+please$/, '');
  if (!normalized) return { state, message: help };
  try {
    // Try the complete command first, because dimensions may themselves contain “and”.
    const whole = parseCommand(normalized);
    const commands = whole ? [whole] : normalized.split(/\s*;\s*|\s*,?\s+and\s+|\s*,\s*/).map(part => parseCommand(part));
    if (commands.some(command => !command)) {
      const dimensionHint = /\bisland\b/.test(normalized) && /\b(width|depth|height|wide|deep|high|tall|dimensions)\b|\d/.test(normalized)
        ? 'Use a number with m or cm, such as “set island width to 240 cm”. Width: 0.8–3.5 m; depth: 0.5–1.6 m; height: 0.65–1.2 m.'
        : help;
      return { state, message: `No changes made. I couldn’t match that to a supported command. ${dimensionHint}` };
    }
    for (const command of commands) command!.apply(next);
    return { state: equal(state, next) ? state : next, message: commands.map(command => command!.message).join(' ') };
  } catch (error) {
    return { state, message: `No changes made. ${error instanceof Error ? error.message : help}` };
  }
}

/** Undo/redo snapshots are isolated from both callers and future edits. */
export class HistoryStore {
  private snapshots: SceneState[];
  private index = 0;

  constructor(state: SceneState = initialState) {
    this.snapshots = [validateState(state)];
  }

  get state(): SceneState { return validateState(this.snapshots[this.index]); }
  get canUndo(): boolean { return this.index > 0; }
  get canRedo(): boolean { return this.index < this.snapshots.length - 1; }

  commit(state: SceneState): SceneState {
    const next = validateState(state);
    if (equal(next, this.snapshots[this.index])) return this.state;
    this.snapshots = this.snapshots.slice(0, this.index + 1);
    this.snapshots.push(next);
    this.index += 1;
    return this.state;
  }

  undo(): SceneState {
    if (this.canUndo) this.index -= 1;
    return this.state;
  }

  redo(): SceneState {
    if (this.canRedo) this.index += 1;
    return this.state;
  }
}
