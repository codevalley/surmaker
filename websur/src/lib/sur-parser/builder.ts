import {
  SurDocument,
  SurMetadata,
  Scale,
  Composition,
  Section,
  Beat,
  Note,
  NotePitch,
  NoteVariant,
  Octave,
  MetadataKey
} from './types';

/**
 * Builder class for creating SurDocument instances with a fluent interface.
 */
export class SurDocumentBuilder {
  private metadata: Partial<SurMetadata> = {};
  private scale: Scale = { notes: {} };
  private sections: Section[] = [];
  private currentSection: Section | null = null;
  private currentBeat: Beat | null = null;

  /**
   * Add metadata to the document
   * @param key - Metadata key
   * @param value - Metadata value
   */
  addMetadata(key: MetadataKey, value: string): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Set multiple metadata values at once
   * @param metadata - Object containing metadata key-value pairs
   */
  setMetadata(metadata: Partial<SurMetadata>): this {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Add a note mapping to the scale
   * @param pitch - The note pitch (S, R, G, etc.)
   * @param name - Full name of the note (Sa, Re, Ga, etc.)
   */
  addScaleNote(pitch: NotePitch, name: string): this {
    this.scale.notes[pitch] = name;
    return this;
  }

  /**
   * Set multiple scale notes at once
   * @param notes - Object containing note mappings
   */
  setScale(notes: Record<NotePitch, string>): this {
    this.scale.notes = notes;
    return this;
  }

  /**
   * Start a new section in the composition
   * @param title - Section title
   */
  startSection(title: string): this {
    this.currentSection = {
      title,
      beats: []
    };
    this.sections.push(this.currentSection);
    return this;
  }

  /**
   * Start a new beat in the current section
   * @param position - Beat position in the section
   * @param bracketed - Whether the beat is bracketed
   */
  startBeat(position: { row: number; beat_number: number }, bracketed = true): this {
    if (!this.currentSection) {
      throw new Error('Cannot add beat without an active section');
    }

    this.currentBeat = {
      elements: [],
      bracketed,
      position
    };
    this.currentSection.beats.push(this.currentBeat);
    return this;
  }

  /**
   * Add a note to the current beat
   * @param pitch - Note pitch
   * @param options - Additional note options
   */
  addNote(pitch: NotePitch, options: {
    variant?: NoteVariant;
    octave?: Octave;
    lyrics?: string;
  } = {}): this {
    if (!this.currentBeat) {
      throw new Error('Cannot add note without an active beat');
    }

    const note: Note = {
      pitch,
      ...options
    };

    this.currentBeat.elements.push({ note, lyrics: options.lyrics });
    return this;
  }

  /**
   * Add a rest (silence) to the current beat
   */
  addRest(): this {
    return this.addNote(NotePitch.SILENCE);
  }

  /**
   * Add a sustain marker to the current beat
   */
  addSustain(): this {
    return this.addNote(NotePitch.SUSTAIN);
  }

  /**
   * Add lyrics without a note to the current beat
   * @param lyrics - The lyrics text
   */
  addLyrics(lyrics: string): this {
    if (!this.currentBeat) {
      throw new Error('Cannot add lyrics without an active beat');
    }

    this.currentBeat.elements.push({ lyrics });
    return this;
  }

  /**
   * Validate the document before building
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.metadata.name) {
      throw new Error('Document must have a name in metadata');
    }

    if (Object.keys(this.scale.notes).length === 0) {
      throw new Error('Scale must contain at least one note mapping');
    }

    if (this.sections.length === 0) {
      throw new Error('Document must have at least one section');
    }
  }

  /**
   * Build the SurDocument
   * @returns Complete SurDocument instance
   * @throws Error if validation fails
   */
  build(): SurDocument {
    this.validate();

    return {
      metadata: this.metadata as SurMetadata, // Safe cast after validation
      scale: this.scale,
      composition: {
        sections: this.sections
      }
    };
  }
}

/**
 * Utility class for common SurDocument operations
 */
export class SurDocumentUtils {
  /**
   * Create a document from raw content string
   * @param content - Raw SureScript content
   * @returns SurDocument instance
   */
  static fromString(content: string): SurDocument {
    const parser = new SurParser();
    return parser.parse(content);
  }

  /**
   * Convert a document to string representation
   * @param doc - SurDocument to convert
   * @returns Formatted SureScript content
   */
  static toString(doc: SurDocument): string {
    let result = '';

    // Add metadata
    result += '%% CONFIG\n';
    Object.entries(doc.metadata).forEach(([key, value]) => {
      result += `${key}: "${value}"\n`;
    });
    result += '\n';

    // Add scale
    result += '%% SCALE\n';
    Object.entries(doc.scale.notes).forEach(([pitch, name]) => {
      result += `${pitch} -> ${name}\n`;
    });
    result += '\n';

    // Add composition
    result += '%% COMPOSITION\n\n';
    doc.composition.sections.forEach(section => {
      result += `#${section.title}\n`;
      section.beats.forEach(beat => {
        result += 'b: ';
        if (beat.bracketed) {
          beat.elements.forEach((element, index) => {
            if (element.note) {
              const note = element.note;
              let noteStr = '';
              
              // Add octave marker
              if (note.octave === -1) noteStr += '.';
              noteStr += note.pitch;
              if (note.octave === 1) noteStr += "'";
              
              // Add lyrics if present
              if (element.lyrics) {
                noteStr = `${element.lyrics}:${noteStr}`;
              }
              
              result += `[${noteStr}]`;
            } else if (element.lyrics) {
              result += `[${element.lyrics}]`;
            }
          });
        }
        result += '\n';
      });
      result += '\n';
    });

    return result;
  }

  /**
   * Validate a SurDocument structure
   * @param doc - Document to validate
   * @returns true if valid, throws Error if invalid
   */
  static validate(doc: SurDocument): boolean {
    if (!doc.metadata?.name) {
      throw new Error('Document must have a name in metadata');
    }

    if (!doc.scale?.notes || Object.keys(doc.scale.notes).length === 0) {
      throw new Error('Scale must contain at least one note mapping');
    }

    if (!doc.composition?.sections || doc.composition.sections.length === 0) {
      throw new Error('Document must have at least one section');
    }

    // Validate each section
    doc.composition.sections.forEach((section, sIndex) => {
      if (!section.title) {
        throw new Error(`Section at index ${sIndex} must have a title`);
      }

      section.beats.forEach((beat, bIndex) => {
        if (!beat.position) {
          throw new Error(`Beat at index ${bIndex} in section "${section.title}" must have a position`);
        }
      });
    });

    return true;
  }
}
