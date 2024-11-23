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

export interface Token {
  type: TokenType;
  value: string;
}

export interface Note {
  pitch: NotePitch;
  octave?: number;
}

export interface Element {
  note?: Note;
  lyrics?: string;
}

export interface Beat {
  elements: Element[];
  bracketed: boolean;
}

export interface Section {
  title: string;
  beats: Beat[];
}

export interface Composition {
  sections: Section[];
}

export interface Scale {
  notes: Record<string, string>;
}

export interface SurMetadata {
  [key: string]: string;
}

export interface SurDocument {
  metadata: SurMetadata;
  scale: Scale;
  composition: Composition;
}

export interface ParsingElement extends Element {
  type: ElementType;
}

// Helper function to determine if a string is a note
export const isNote = (str: string): boolean => {
  // Notes are:
  // 1. Single uppercase letters from SRGMPDN
  // 2. Can have octave markers (. or ')
  // 3. Can be - (silence) or * (sustain)
  const validNotes = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '-', '*'];
  const baseNote = str.charAt(0);
  const rest = str.slice(1);
  
  if (!validNotes.includes(baseNote)) return false;
  if (rest && !rest.match(/^[.']*$/)) return false;
  
  return true;
};

// Helper function to determine if a string is lyrics
export const isLyrics = (str: string): boolean => {
  // Remove any whitespace
  str = str.trim();
  
  // Empty string is not lyrics
  if (!str) return false;
  
  // If it's a valid note, it's not lyrics
  if (isNote(str)) return false;
  
  // If it's in quotes, it's lyrics
  if (str.startsWith('"') && str.endsWith('"')) return true;
  
  // If it contains any lowercase letters, it's lyrics
  if (/[a-z]/.test(str)) return true;
  
  // If it's a special character, it's not lyrics
  if (str === '-' || str === '*') return false;
  
  return true;
};

// Helper function to tokenize a beat content
export const tokenizeBeatContent = (content: string): Token[] => {
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
