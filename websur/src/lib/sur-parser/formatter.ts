import { Beat, Element, Note } from './types';

export class SurFormatter {
  private formatLyrics(lyrics: string): string {
    // Always wrap lyrics containing spaces in quotes
    return lyrics.includes(' ') ? `"${lyrics}"` : lyrics;
  }

  private formatNote(note: Note): string {
    const pitch = note.pitch;
    if (!note.octave) return pitch;
    
    // Upper octave: add ' after note
    if (note.octave === 1) return `${pitch}'`;
    // Lower octave: add . before note
    if (note.octave === -1) return `.${pitch}`;
    
    return pitch;
  }

  private formatElement(element: Element): string {
    if (element.lyrics && element.note) {
      // Format as lyrics:note, wrapping lyrics in quotes if it contains spaces
      return `${this.formatLyrics(element.lyrics)}:${this.formatNote(element.note)}`;
    }
    if (element.lyrics) {
      // Wrap lyrics in quotes if it contains spaces
      return this.formatLyrics(element.lyrics);
    }
    if (element.note) {
      return this.formatNote(element.note);
    }
    return '';
  }

  private hasLyrics(elements: Element[]): boolean {
    return elements.some(e => e.lyrics !== undefined);
  }

  private formatBeat(beat: Beat): string {
    const elements = beat.elements;
    if (elements.length === 0) return '';
    if (elements.length === 1) return this.formatElement(elements[0]);

    // Multiple elements
    const formattedElements = elements.map(e => this.formatElement(e));
    
    // If any element has lyrics, wrap in brackets and separate with spaces
    if (this.hasLyrics(elements)) {
      return `[${formattedElements.join(' ')}]`;
    }
    
    // Only notes - render side by side without spaces or brackets
    return formattedElements.join('');
  }

  formatBeats(beats: Beat[]): string {
    // Always add spaces between beats
    return beats
      .map(beat => this.formatBeat(beat))
      .filter(str => str.length > 0)
      .join(' ');  // This ensures space between each beat
  }
}
