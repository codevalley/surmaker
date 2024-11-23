import { Beat, Element, Note, NotePitch } from './types';

export class SurFormatter {
  private formatNote(note: Note): string {
    if (!note) return '';
    
    // Handle special notes
    if (note.pitch === NotePitch.SILENCE) return '-';
    if (note.pitch === NotePitch.SUSTAIN) return '*';
    
    // Format the note with octave markers
    let noteStr = note.pitch.toString();
    
    // Add octave markers
    if (note.octave === 1) {
      noteStr += "'";  // Upper octave
    } else if (note.octave === -1) {
      noteStr = '.' + noteStr;  // Lower octave
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
    // Don't use beat.bracketed as it's only for parsing
    
    // If there's only one element with both lyrics and note, no brackets needed
    if (beat.elements.length === 1 && beat.elements[0].lyrics && beat.elements[0].note) {
      return false;
    }
    
    // If there are multiple elements and any has lyrics, we need brackets
    if (beat.elements.length > 1 && beat.elements.some(e => e.lyrics)) {
      return true;
    }
    
    // If there are multiple elements with spaces needed between them
    if (beat.elements.length > 1 && this.needsSpaceBetweenElements(beat.elements)) {
      return true;
    }
    
    return false;
  }

  private needsSpaceBetweenElements(elements: Element[]): boolean {
    // Need spaces if:
    // 1. Any element has lyrics
    // 2. Any element has octave markers that could be ambiguous
    // 3. Any element needs special formatting
    return elements.some(e => 
      e.lyrics || 
      (e.note && e.note.octave !== 0) ||
      (e.note && [NotePitch.SILENCE, NotePitch.SUSTAIN].includes(e.note.pitch))
    );
  }

  private formatBeat(beat: Beat): string {
    if (!beat || !beat.elements || beat.elements.length === 0) {
      return '-';
    }

    const formattedElements = beat.elements.map(e => this.formatElement(e));
    
    // Determine if we need brackets
    if (this.shouldBracket(beat)) {
      // For beats with lyrics, join all notes without spaces
      if (beat.elements.some(e => e.lyrics)) {
        const lyricsElement = formattedElements.find(e => e.includes(':') || !e.match(/^[SRGMPDN'.-]*$/));
        const noteElements = formattedElements.filter(e => !e.includes(':') && e.match(/^[SRGMPDN'.-]*$/));
        const notes = noteElements.join('');
        return `[${lyricsElement} ${notes}]`;
      }
      
      // For other cases that need brackets
      return `[${formattedElements.join(' ')}]`;
    }
    
    // For simple notes without lyrics, join without spaces
    return formattedElements.join('');
  }

  public formatLine(beats: Beat[]): string {
    // Join beats with spaces
    return beats.map(beat => this.formatBeat(beat)).join(' ');
  }
}
