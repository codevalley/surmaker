export enum NotePitch {
  S = 'S',
  R = 'R',
  G = 'G',
  M = 'M',
  P = 'P',
  D = 'D',
  N = 'N',
  SILENCE = '-',
  SUSTAIN = '*'
}

export enum NoteVariant {
  SHUDHA = 'SHUDHA',
  KOMAL = 'KOMAL',
  TIVRA = 'TIVRA'
}

export enum TokenType {
  NOTE = 'NOTE',
  LYRICS = 'LYRICS',
  COLON = 'COLON',
  OPEN_BRACKET = 'OPEN_BRACKET',
  CLOSE_BRACKET = 'CLOSE_BRACKET',
  SEPARATOR = 'SEPARATOR',
  SILENCE = 'SILENCE',
  SUSTAIN = 'SUSTAIN'
}

export enum ElementType {
  NORMAL = 'NORMAL',
  SEPARATOR = 'SEPARATOR',
  OPEN_BRACKET = 'OPEN_BRACKET',
  CLOSE_BRACKET = 'CLOSE_BRACKET'
}

export type Octave = -1 | 0 | 1; // -1: lower, 0: middle, 1: upper
export type MetadataKey = 'name' | 'raag' | 'taal' | 'beats_per_row' | 'tempo' | string;

export interface Token {
  readonly type: TokenType;
  readonly value: string;
}

export interface Note {
  readonly pitch: NotePitch;
  readonly variant?: NoteVariant;
  readonly octave?: Octave;
}

export interface Element {
  readonly note?: Note;
  readonly lyrics?: string;
}

export interface Beat {
  readonly elements: readonly Element[];
  readonly bracketed: boolean;
  readonly position: {
    readonly row: number;
    readonly beat_number: number;
  };
}

export interface Section {
  readonly title: string;
  readonly beats: readonly Beat[];
}

export interface Composition {
  readonly sections: readonly Section[];
}

export interface Scale {
  readonly notes: Readonly<Record<NotePitch, string>>;
}

export interface SurMetadata extends Readonly<Record<MetadataKey, string>> {
  readonly name: string;      // Required
  readonly raag?: string;     // Optional but common
  readonly taal?: string;     // Optional but common
  readonly tempo?: string;    // Optional
  readonly beats_per_row?: string; // Optional
}

export interface SurDocument {
  readonly metadata: SurMetadata;
  readonly scale: Scale;
  readonly composition: Composition;
}

export interface ParsingElement extends Element {
  readonly type: ElementType;
}

/**
 * Checks if a string represents a valid musical note.
 * @param str - The string to check
 * @returns True if the string is a valid note, false otherwise
 */
export const isNote = (str: string): boolean => {
  const validNotes = Object.values(NotePitch);
  const baseNote = str.charAt(0);
  const rest = str.slice(1);
  
  if (!validNotes.includes(baseNote as NotePitch)) return false;
  if (rest && !rest.match(/^[.']*$/)) return false;
  
  return true;
};

/**
 * Checks if a string represents lyrics.
 * @param str - The string to check
 * @returns True if the string represents lyrics, false otherwise
 */
export const isLyrics = (str: string): boolean => {
  // Lyrics are any non-empty string that doesn't start with a note or special character
  if (!str || str.length === 0) return false;
  return !isNote(str) && !['[', ']', ':'].includes(str);
};

/**
 * Helper function to tokenize beat content.
 * @param content - The beat content to tokenize
 * @returns Array of tokens
 */
export const tokenizeBeatContent = (content: string): readonly Token[] => {
  const tokens: Token[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    // Handle quotes
    if (char === '"') {
      if (inQuotes) {
        // Don't add the closing quote, just end the lyrics token
        tokens.push({ type: TokenType.LYRICS, value: current });
        current = '';
        inQuotes = false;
      } else {
        if (current) {
          tokens.push({ 
            type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
            value: current 
          });
        }
        // Don't add the opening quote, just start collecting lyrics
        current = '';
        inQuotes = true;
      }
      continue;
    }
    
    // If we're in quotes, keep building the current token
    if (inQuotes) {
      current += char;
      continue;
    }
    
    // Handle spaces
    if (char === ' ') {
      if (current) {
        tokens.push({ 
          type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
          value: current 
        });
        current = '';
      }
      continue;
    }
    
    // Handle colon
    if (char === ':') {
      if (current) {
        tokens.push({ 
          type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
          value: current 
        });
        current = '';
      }
      tokens.push({ type: TokenType.COLON, value: ':' });
      continue;
    }
    
    // Handle brackets
    if (char === '[') {
      if (current) {
        tokens.push({ 
          type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
          value: current 
        });
        current = '';
      }
      tokens.push({ type: TokenType.OPEN_BRACKET, value: '[' });
      continue;
    }
    
    if (char === ']') {
      if (current) {
        tokens.push({ 
          type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
          value: current 
        });
        current = '';
      }
      tokens.push({ type: TokenType.CLOSE_BRACKET, value: ']' });
      continue;
    }
    
    // Build current token
    current += char;
  }
  
  // Handle any remaining content
  if (current) {
    tokens.push({ 
      type: isNote(current) ? TokenType.NOTE : TokenType.LYRICS, 
      value: current 
    });
  }
  
  return tokens;
};

interface TaalVariant {
  beats: number;
  divisions: number;
  structure: string;
  bols: string[][];
  markers: string[];
}

interface Taal {
  name: string;
  variants: {
    default: TaalVariant;
    [key: string]: TaalVariant;  // For other variants
  };
}

interface TaalDatabase {
  taals: {
    [key: string]: Taal;
  }
}
