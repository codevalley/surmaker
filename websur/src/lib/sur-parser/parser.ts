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
  NoteVariant
} from './types';

export class SurParser {
  // Regex patterns for tokenization
  private readonly notePattern = String.raw`(?:\.|,)*[SRGMPDN](?:'|,)*|-|\*`;  // Matches .S, S', S, etc. and - *
  private readonly quotedLyrics = String.raw`"[^"]*"`;  // Matches anything in quotes
  private readonly symbols = String.raw`[\[\]:]`;  // Matches brackets and colon
  private readonly separator = String.raw`\s+`;  // Matches whitespace
  private readonly mixedText = String.raw`[a-zA-Z][a-zA-Z0-9]*`;  // Matches text without spaces/symbols

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      // Skip whitespace outside of quotes
      if (char === ' ' || char === '\t') {
        i++;
        continue;
      }
      
      // Handle quoted lyrics
      if (char === '"') {
        let lyrics = '';
        i++; // Skip opening quote
        while (i < text.length && text[i] !== '"') {
          lyrics += text[i];
          i++;
        }
        i++; // Skip closing quote
        tokens.push({ type: TokenType.LYRICS, value: lyrics });
        continue;
      }
      
      // Handle notes with octave markers
      if (char === '.' || char === '\'' || this.isNote(char)) {
        let note = '';
        if (char === '.') {
          note = char;
          i++;
        }
        if (i < text.length && this.isNote(text[i])) {
          note += text[i];
          i++;
        }
        if (i < text.length && text[i] === '\'') {
          note += text[i];
          i++;
        }
        if (note) {
          tokens.push({ type: TokenType.NOTE, value: note });
        }
        continue;
      }
      
      // Handle unquoted lyrics (single words without spaces)
      if (/[a-z]/i.test(char)) {
        let lyrics = '';
        while (i < text.length && /[a-z]/i.test(text[i])) {
          lyrics += text[i];
          i++;
        }
        tokens.push({ type: TokenType.LYRICS, value: lyrics });
        continue;
      }
      
      // Handle special characters
      switch (char) {
        case ':':
          tokens.push({ type: TokenType.COLON, value: ':' });
          break;
        case '[':
          tokens.push({ type: TokenType.OPEN_BRACKET, value: '[' });
          break;
        case ']':
          tokens.push({ type: TokenType.CLOSE_BRACKET, value: ']' });
          break;
        case '-':
          tokens.push({ type: TokenType.NOTE, value: '-' });
          break;
        case '*':
          tokens.push({ type: TokenType.NOTE, value: '*' });
          break;
      }
      i++;
    }
    
    return tokens;
  }

  private isNote(char: string): boolean {
    return ['S', 'R', 'G', 'M', 'P', 'D', 'N'].includes(char.toUpperCase());
  }

  private parseNote(text: string): Note | null {
    console.log('Parsing note:', text);
    if (!text) {
      console.log('Empty note text');
      return null;
    }

    // Handle special notes (silence and sustain)
    if (text === '-') {
      console.log('Found silence note');
      return { pitch: NotePitch.SILENCE };
    }
    if (text === '*') {
      console.log('Found sustain note');
      return { pitch: NotePitch.SUSTAIN };
    }

    // Parse octave
    let octave = 0;
    let workingText = text;
    
    while (workingText.endsWith("'")) {
      octave += 1;
      workingText = workingText.slice(0, -1);
      console.log('Found upper octave, current octave:', octave);
    }
    while (workingText.endsWith(',')) {
      octave -= 1;
      workingText = workingText.slice(0, -1);
      console.log('Found lower octave (comma), current octave:', octave);
    }
    while (workingText.startsWith('.')) {
      octave -= 1;
      workingText = workingText.slice(1);
      console.log('Found lower octave (dot), current octave:', octave);
    }

    // Parse pitch
    try {
      console.log('Parsing pitch:', workingText);
      const pitch = NotePitch[workingText as keyof typeof NotePitch];
      if (pitch === undefined) {
        console.error('Invalid pitch:', workingText);
        return null;
      }
      console.log('Found valid pitch:', pitch, 'with octave:', octave);
      return { pitch, octave };
    } catch (e) {
      console.error('Error parsing note:', text, e);
      return null;
    }
  }

  private tokensToElements(tokens: Token[]): ParsingElement[] {
    const elements: ParsingElement[] = [];
    let i = 0;

    console.log('Converting tokens to elements:', tokens.map(t => `${t.type}(${t.value})`));

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
          const note = this.parseNote(token.value);
          if (note) {
            elements.push({
              type: ElementType.NORMAL,
              note
            });
          }
          i++;
          break;

        case TokenType.LYRICS:
          if (i + 2 < tokens.length && 
              tokens[i + 1].type === TokenType.COLON && 
              tokens[i + 2].type === TokenType.NOTE) {
            const note = this.parseNote(tokens[i + 2].value);
            if (note) {
              elements.push({
                type: ElementType.NORMAL,
                lyrics: token.value,
                note
              });
            }
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

    console.log('Elements:', elements.map(e => 
      `${e.type}(${e.lyrics || ''} ${e.note ? JSON.stringify(e.note) : ''})`
    ));

    return elements;
  }

  private elementsToBeats(elements: ParsingElement[]): Beat[] {
    const beats: Beat[] = [];
    let currentElements: ParsingElement[] = [];
    let bracketElements: ParsingElement[] = [];
    let inBracket = false;

    const createBeat = (elems: ParsingElement[]) => {
      if (elems.length > 0) {
        // Only include the lyrics and note properties in the final elements
        const cleanElements = elems.map(({ lyrics, note }) => ({
          ...(lyrics && { lyrics }),
          ...(note && { note })
        }));
        beats.push({ elements: cleanElements });
      }
    };

    for (const element of elements) {
      if (element.type === ElementType.SEPARATOR) {
        if (!inBracket && currentElements.length > 0) {
          createBeat(currentElements);
          currentElements = [];
        }
      } else if (element.type === ElementType.OPEN_BRACKET) {
        if (currentElements.length > 0) {
          createBeat(currentElements);
          currentElements = [];
        }
        inBracket = true;
        bracketElements = [];
      } else if (element.type === ElementType.CLOSE_BRACKET) {
        inBracket = false;
        if (bracketElements.length > 0) {
          createBeat(bracketElements);
          bracketElements = [];
        }
      } else if (element.type === ElementType.NORMAL) {
        if (inBracket) {
          bracketElements.push(element);
        } else {
          currentElements.push(element);
        }
      }
    }

    if (currentElements.length > 0) {
      createBeat(currentElements);
    }

    console.log('Beats:', beats.map(b => 
      `Beat(${b.elements.map(e => 
        e.lyrics ? e.lyrics : e.note ? JSON.stringify(e.note) : 'unknown'
      ).join(', ')})`
    ));

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
          name: trimmedLine.slice(1),
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
