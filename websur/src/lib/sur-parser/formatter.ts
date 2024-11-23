import { Beat, Element, Note, NotePitch } from './types';

// Unicode combining characters for octave markers
const UPPER_BAR = '\u0305'; // Combining overline
const LOWER_BAR = '\u0332'; // Combining underline

export class SurFormatter {
  private formatNote(note: Note): string {
    if (!note) return '';
    
    // Handle special notes
    if (note.pitch === NotePitch.SILENCE) return '-';
    if (note.pitch === NotePitch.SUSTAIN) return '*';
    
    // Get the base note string
    const noteStr = note.pitch.toString();
    
    // Add octave markers using combining characters
    if (note.octave === 1) {
      return `${noteStr}${UPPER_BAR}`;  // Add bar above
    } else if (note.octave === -1) {
      return `${noteStr}${LOWER_BAR}`;  // Add bar below
    }
    
    return noteStr;
  }

  private formatLyrics(lyrics: string): string {
    if (!lyrics) return '';
    
    // If lyrics contains whitespace or special characters, wrap in quotes
    if (lyrics.includes(' ') || /[[\]:*-]/.test(lyrics)) {
      return `"${lyrics}"`;
    }
    
    return lyrics;
  }

  private formatElement(element: Element): string {
    if (!element) return '';
    
    // Case 1: Both lyrics and note
    if (element.lyrics && element.note) {
      return `${this.formatLyrics(element.lyrics)}:${this.formatNote(element.note)}`;
    }
    
    // Case 2: Only lyrics
    if (element.lyrics) {
      return this.formatLyrics(element.lyrics);
    }
    
    // Case 3: Only note
    if (element.note) {
      return this.formatNote(element.note);
    }
    
    return '-';  // Default to silence for empty elements
  }

  private shouldBracket(beat: Beat): boolean {
    // If there's only one element, never need brackets
    if (beat.elements.length === 1) return false;
    
    // If any element has lyrics, we need brackets
    if (beat.elements.some(e => e.lyrics)) return true;
    
    // For multiple notes, we don't need brackets unless they need spaces
    if (beat.elements.length > 1 && this.needsSpaceBetweenElements(beat.elements)) {
      return true;
    }
    
    return false;
  }

  private needsSpaceBetweenElements(elements: Element[]): boolean {
    // We only need spaces if there are lyrics
    // Notes (including * and -) can always be joined without spaces
    return elements.some(e => e.lyrics);
  }

  public formatBeat(beat: Beat): string {
    if (!beat || !beat.elements || beat.elements.length === 0) {
      return '-';
    }

    const formattedElements = beat.elements.map(e => this.formatElement(e));
    
    // Determine if we need brackets
    if (this.shouldBracket(beat)) {
      // For beats with lyrics, join all notes without spaces
      if (beat.elements.some(e => e.lyrics)) {
        const lyricsElement = formattedElements.find(e => e.includes(':') || !e.match(/^[SRGMPDN\-\*'.-]*$/));
        const noteElements = formattedElements.filter(e => !e.includes(':') && e.match(/^[SRGMPDN\-\*'.-]*$/));
        const notes = noteElements.join('');
        return `[${lyricsElement} ${notes}]`;
      }
      
      // For other cases that need brackets
      return `[${formattedElements.join(' ')}]`;
    }
    
    // For notes without lyrics, always join without spaces
    return formattedElements.join('');
  }

  public formatLine(beats: Beat[]): string {
    // Join beats with spaces
    return beats.map(beat => this.formatBeat(beat)).join(' ');
  }
}
