import {
  SurDocument,
  SurMetadata,
  Scale,
  Composition,
  Section,
  Beat,
  Note,
  Token,
  TokenType,
  ParsingElement,
  ElementType,
  NotePitch,
  NoteVariant,
  tokenizeBeatContent,
  Octave
} from './types';

export class SurParser {
  // Update regex patterns to handle more complex combinations
  private readonly notePattern = String.raw`[SRGMPDN]['\.]?|\*|-`;  // Basic note, sustain, or silence
  private readonly quotedLyrics = String.raw`"[^"]*"`;  // Matches anything in quotes
  private readonly symbols = String.raw`[\[\]:]`;  // Matches brackets and colon
  private readonly separator = String.raw`\s+`;  // Matches whitespace
  private readonly mixedText = String.raw`[a-zA-Z][a-zA-Z0-9]*`;  // Matches text without spaces/symbols

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let current = '';
    let inQuotes = false;

    const addToken = (value: string) => {
      if (!value) return;

      // Handle compound patterns by splitting into individual tokens
      if (!inQuotes && value.match(/^[-*SRGMPDN'.]+$/)) {
        // Split the compound pattern into individual characters/notes
        const parts = value.match(/[SRGMPDN]['\.]?|\*|-/g) || [];
        parts.forEach(part => {
          tokens.push({ type: TokenType.NOTE, value: part });
        });
        return;
      }
      
      // Handle other tokens normally
      if (value.startsWith('"') && value.endsWith('"')) {
        tokens.push({ type: TokenType.LYRICS, value: value.slice(1, -1) });
      } else if (value.match(/^[a-zA-Z]/)) {
        tokens.push({ type: TokenType.LYRICS, value });
      }
    };

    // Process character by character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        if (inQuotes) {
          tokens.push({ type: TokenType.LYRICS, value: current });
          current = '';
          inQuotes = false;
        } else {
          if (current) addToken(current);
          current = '';
          inQuotes = true;
        }
        continue;
      }

      if (!inQuotes) {
        if (char === ' ') {
          if (current) addToken(current);
          tokens.push({ type: TokenType.SEPARATOR, value: ' ' });
          current = '';
          continue;
        }

        if (char === '[') {
          if (current) addToken(current);
          tokens.push({ type: TokenType.OPEN_BRACKET, value: '[' });
          current = '';
          continue;
        }

        if (char === ']') {
          if (current) addToken(current);
          tokens.push({ type: TokenType.CLOSE_BRACKET, value: ']' });
          current = '';
          continue;
        }

        if (char === ':') {
          if (current) addToken(current);
          tokens.push({ type: TokenType.COLON, value: ':' });
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current) addToken(current);

    return tokens;
  }

  private parseNote(noteToken: string): Note {
    // Handle special notes first
    if (noteToken === '-') {
        return { pitch: NotePitch.SILENCE };
    }
    if (noteToken === '*') {
        return { pitch: NotePitch.SUSTAIN };
    }
    
    // For regular notes, first character is the pitch, second (if exists) is octave
    const pitch = noteToken[0] as NotePitch;
    const octaveMarker = noteToken[1];
    
    let octave: Octave = 0;  // Default to middle octave
    if (octaveMarker === "'") {
        octave = 1;  // Upper octave
    } else if (octaveMarker === ".") {
        octave = -1;  // Lower octave
    }
    
    return {
        pitch,
        octave
    };
  }

  private tokensToElements(tokens: Token[]): ParsingElement[] {
    const elements: ParsingElement[] = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      switch (token.type) {
        case TokenType.SEPARATOR:
          elements.push({ type: ElementType.SEPARATOR });
          i++;
          break;

        case TokenType.OPEN_BRACKET:
          elements.push({ type: ElementType.OPEN_BRACKET });
          i++;
          break;

        case TokenType.CLOSE_BRACKET:
          elements.push({ type: ElementType.CLOSE_BRACKET });
          i++;
          break;

        case TokenType.NOTE:
          elements.push({
            type: ElementType.NORMAL,
            note: this.parseNote(token.value)
          });
          i++;
          break;

        case TokenType.LYRICS:
          // Check for lyrics:note pattern
          if (i + 2 < tokens.length && 
              tokens[i + 1].type === TokenType.COLON && 
              tokens[i + 2].type === TokenType.NOTE) {
            elements.push({
              type: ElementType.NORMAL,
              lyrics: token.value,
              note: this.parseNote(tokens[i + 2].value)
            });
            i += 3;
          } else {
            elements.push({
              type: ElementType.NORMAL,
              lyrics: token.value
            });
            i++;
          }
          break;

        default:
          i++;
          break;
      }
    }

    return elements;
  }

  private elementsToBeats(elements: ParsingElement[]): Beat[] {
    const beats: Beat[] = [];
    let currentElements: ParsingElement[] = [];
    let bracketElements: ParsingElement[] = [];
    let inBracket = false;

    const createBeat = (elems: ParsingElement[], bracketed: boolean) => {
      if (elems.length > 0) {
        beats.push({
          elements: elems.filter(e => e.type === ElementType.NORMAL),
          bracketed,
          position: { row: 0, beat_number: beats.length }
        });
      }
    };

    for (const element of elements) {
      switch (element.type) {
        case ElementType.SEPARATOR:
          if (!inBracket && currentElements.length > 0) {
            createBeat(currentElements, false);
            currentElements = [];
          }
          break;

        case ElementType.OPEN_BRACKET:
          if (currentElements.length > 0) {
            createBeat(currentElements, false);
            currentElements = [];
          }
          inBracket = true;
          break;

        case ElementType.CLOSE_BRACKET:
          if (bracketElements.length > 0) {
            createBeat(bracketElements, true);
            bracketElements = [];
          }
          inBracket = false;
          break;

        case ElementType.NORMAL:
          if (inBracket) {
            bracketElements.push(element);
          } else {
            currentElements.push(element);
          }
          break;
      }
    }

    // Handle any remaining elements
    if (currentElements.length > 0) {
      createBeat(currentElements, false);
    }

    return beats;
  }

  private parseComposition(lines: string[]): Composition {
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let currentRow = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        continue;
      }

      if (trimmedLine.startsWith('#')) {
        // New section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmedLine.slice(1).trim(),
          beats: []
        };
        currentRow = 0;
      } else if (trimmedLine.startsWith('b:')) {
        if (!currentSection) {
          console.warn('Found beat line without a section:', trimmedLine);
          continue;
        }

        // Remove the 'b:' prefix and tokenize
        const beatLine = trimmedLine.slice(2).trim();
        const tokens = this.tokenize(beatLine);
        const elements = this.tokensToElements(tokens);
        const beats = this.elementsToBeats(elements);
        
        if (beats.length > 0) {
          currentSection.beats.push(...beats);
          currentRow++;
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return { sections };
  }

  private parseMetadata(lines: string[]): SurMetadata {
    const metadata: SurMetadata = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        // Remove quotes if present
        const cleanValue = value.replace(/^"(.*)"$/, '$1');
        metadata[key] = cleanValue;
      }
    }
    
    return metadata;
  }

  private parseScale(lines: string[]): Scale {
    const notes: Record<string, string> = {};
    
    for (const line of lines) {
      if (!line.includes('->')) continue;
      const [symbol, name] = line.split('->').map(s => s.trim());
      if (symbol && name) {
        notes[symbol] = name.replace(/^"(.*)"$/, '$1');
      }
    }
    
    return { notes };
  }

  public parse(content: string): SurDocument {
    const lines = content.split('\n').map(line => line.trim());
    let currentSection: 'config' | 'scale' | 'composition' | null = null;
    const sectionLines: Record<string, string[]> = {
      config: [],
      scale: [],
      composition: []
    };

    for (const line of lines) {
      if (!line || line.startsWith('//')) continue;

      // Determine section
      if (line === '%% CONFIG') {
        currentSection = 'config';
        continue;
      } else if (line === '%% SCALE') {
        currentSection = 'scale';
        continue;
      } else if (line === '%% COMPOSITION') {
        currentSection = 'composition';
        continue;
      }

      // Add line to current section
      if (currentSection) {
        if (line.startsWith('%%')) {
          currentSection = null;
        } else {
          sectionLines[currentSection].push(line);
        }
      }
    }

    const metadata = this.parseMetadata(sectionLines.config);
    const scale = this.parseScale(sectionLines.scale);
    const composition = this.parseComposition(sectionLines.composition);

    return { metadata, scale, composition };
  }
}
