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

  private parseNote(noteStr: string): Note {
    console.log('Parsing note:', noteStr);
    const trimmedNote = noteStr.trim();
    
    // Handle special characters
    if (trimmedNote === '-') {
      return { isSpecial: true, sur: '-' };
    }
    if (trimmedNote === '*') {
      return { isSpecial: true, sur: '*' };
    }

    let note: Note = {};

    // Check if it's a musical note (uppercase letters)
    if (/^[A-Z]/.test(trimmedNote)) {
      // Handle octave notation
      if (trimmedNote.includes("'")) {
        note.octave = 'upper';
        note.sur = trimmedNote.replace(/'/g, '');
      } else if (trimmedNote.startsWith('.')) {
        note.octave = 'lower';
        note.sur = trimmedNote.substring(1);
      } else {
        note.octave = 'middle';
        note.sur = trimmedNote;
      }
    } else {
      // It's lyrics
      note.lyrics = trimmedNote;
    }

    console.log('Parsed note:', note);
    return note;
  }

  private parseBeat(beatStr: string, row: number, beatNumber: number): Beat {
    console.log('Parsing beat:', beatStr);
    
    // Remove 'b:' and trim
    const content = beatStr.replace(/^b:/, '').trim();
    
    // Split the content by spaces, preserving quoted strings
    const tokens = content.split(/\s+/);
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
