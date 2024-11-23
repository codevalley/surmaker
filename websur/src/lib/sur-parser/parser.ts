import {
  SurDocument,
  SurMetadata,
  Scale,
  Composition,
  Section,
  Beat,
  Note
} from './types';

const SECTION_MARKER = '#';
const CONFIG_MARKER = '%%';
const SCALE_MARKER = '@SCALE';
const COMPOSITION_MARKER = '@COMPOSITION';
const BEAT_MARKER = 'b:';

export class SurParser {
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

  private isValidSurNote(note: string): boolean {
    // Remove octave markers
    const cleanNote = note.replace(/^\./, '').replace(/'/g, '');
    // Check if it's a sequence of valid notes (S, R, G, M, P, D, N)
    return /^[SRGMPDN]+$/.test(cleanNote);
  }

  private parseNoteOctave(note: string): Partial<Note> {
    // For compound notes, we need to handle individual octave markers
    if (note.length > 1) {
      const notes: Array<{ sur: string; octave: 'upper' | 'middle' | 'lower' }> = [];
      let i = 0;
      
      while (i < note.length) {
        if (note[i] === '.') {
          // Lower octave marker applies only to the next note
          i++;
          if (i < note.length && /[SRGMPDN]/.test(note[i])) {
            notes.push({
              sur: note[i],
              octave: 'lower'
            });
            i++;
          }
        } else if (/[SRGMPDN]/.test(note[i])) {
          // Found a note
          const sur = note[i];
          i++;
          // Check if next char is an upper octave marker
          const hasUpperOctave = i < note.length && note[i] === "'";
          if (hasUpperOctave) {
            notes.push({
              sur: sur,
              octave: 'upper'
            });
            i++;
          } else {
            notes.push({
              sur: sur,
              octave: 'middle'
            });
          }
        } else {
          i++;
        }
      }
      
      if (notes.length > 1) {
        return { compound: notes };
      } else if (notes.length === 1) {
        return notes[0];
      }
    }

    // Handle single note with octave
    if (note.startsWith('.')) {
      return {
        octave: 'lower',
        sur: note.slice(1)
      };
    } else if (note.endsWith("'")) {
      return {
        octave: 'upper',
        sur: note.slice(0, -1)
      };
    }

    // Single note in middle octave
    return {
      octave: 'middle',
      sur: note
    };
  }

  private parseNote(noteStr: string): Note {
    console.log('Parsing note:', noteStr);
    const trimmedNote = noteStr.trim();
    
    // Handle notes followed by special characters (N-, .N-, N'-)
    if (/^(?:\.[SRGMPDN]|[SRGMPDN]'?|[SRGMPDN])[-*]$/.test(trimmedNote)) {
      const hasLowerOctave = trimmedNote.startsWith('.');
      const hasUpperOctave = trimmedNote.includes("'");
      let notePart = trimmedNote.slice(0, -1); // Remove special char
      let sur = notePart;
      
      if (hasLowerOctave) {
        sur = notePart.slice(1);  // Remove the dot
      } else if (hasUpperOctave) {
        sur = notePart.slice(0, -1);  // Remove the quote
      }
      
      return {
        mixed: [
          {
            sur: sur,
            octave: hasLowerOctave ? 'lower' : hasUpperOctave ? 'upper' : 'middle'
          },
          { isSpecial: true, sur: trimmedNote.slice(-1) }
        ]
      };
    }

    // Handle special characters with notes (*S and -S)
    if ((trimmedNote.startsWith('*') || trimmedNote.startsWith('-')) && trimmedNote.length > 1) {
      const specialChar = trimmedNote[0];
      const remainingNote = trimmedNote.slice(1);
      const parsedNote = this.parseNoteOctave(remainingNote);
      
      return {
        mixed: [
          { isSpecial: true, sur: specialChar },
          parsedNote
        ]
      };
    }
    
    // Handle standalone special characters
    if (trimmedNote === '-') {
      return { isSpecial: true, sur: '-' };
    }
    if (trimmedNote === '*') {
      return { isSpecial: true, sur: '*' };
    }

    // Handle compound notes or single notes with octaves
    return this.parseNoteOctave(trimmedNote);
  }

  private parseBeat(beatStr: string, row: number, beatNumber: number): Beat {
    console.log('Parsing beat:', beatStr);
    
    // Remove 'b:' and trim
    const content = beatStr.replace(/^b:/, '').trim();
    
    // Handle bracketed groups while preserving spaces within brackets
    const tokens: string[] = [];
    let currentToken = '';
    let inBrackets = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '[') {
        inBrackets = true;
        currentToken = '[';
      } else if (char === ']') {
        inBrackets = false;
        currentToken += ']';
        tokens.push(currentToken);
        currentToken = '';
      } else if (!inBrackets && char === ' ') {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken) {
      tokens.push(currentToken);
    }

    const notes: Note[] = tokens.map(token => this.parseNote(token));

    const beat = {
      position: { row, beat_number: beatNumber },
      notes
    };
    console.log('Parsed beat:', beat);
    return beat;
  }

  private parseComposition(lines: string[]): Composition {
    console.log('Parsing composition, lines:', lines);
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let currentRow = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      console.log('Processing line:', trimmedLine);
      
      if (trimmedLine.startsWith('#')) {
        // New section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          name: trimmedLine.substring(1).trim(),
          beats: []
        };
        currentRow = 0;
        console.log('Created new section:', currentSection);
      } else if (trimmedLine.startsWith('b:')) {
        if (!currentSection) {
          console.warn('Found beat line without a section:', trimmedLine);
          continue;
        }
        const beat = this.parseBeat(trimmedLine, currentRow, currentSection.beats.length);
        currentSection.beats.push(beat);
        currentRow++;
        console.log('Added beat to section:', beat);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    console.log('Final sections:', sections);
    return { sections };
  }

  public parse(content: string): SurDocument {
    console.log('Parsing content:', content);
    const lines = content.split('\n').map(line => line.trim());
    let currentSection: 'config' | 'scale' | 'composition' | null = null;
    const sectionLines: Record<string, string[]> = {
      config: [],
      scale: [],
      composition: []
    };

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('//')) continue;

      // Determine section
      if (line === '%% CONFIG') {
        currentSection = 'config';
        console.log('Switched to config section');
        continue;
      } else if (line === '%% SCALE') {
        currentSection = 'scale';
        console.log('Switched to scale section');
        continue;
      } else if (line === '%% COMPOSITION') {
        currentSection = 'composition';
        console.log('Switched to composition section');
        continue;
      }

      // Add line to current section
      if (currentSection) {
        // For config section, only add lines with ':'
        if (currentSection === 'config') {
          if (line.includes(':')) {
            sectionLines[currentSection].push(line);
          }
        } else {
          sectionLines[currentSection].push(line);
        }
      }
    }

    console.log('Section lines:', sectionLines);

    const metadata = this.parseMetadata(sectionLines.config);
    const scale = this.parseScale(sectionLines.scale);
    const composition = this.parseComposition(sectionLines.composition);

    const doc = { metadata, scale, composition };
    console.log('Final parsed document:', doc);
    return doc;
  }
}
