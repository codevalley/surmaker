export interface SurMetadata {
  name?: string;
  raag?: string;
  taal?: string;
  beats_per_row?: number;
  tempo?: string;
  [key: string]: any; // Allow for additional metadata
}

export interface ScaleNote {
  symbol: string;  // The note symbol (S, R, G, etc.)
  name: string;    // The full name (Sa, Re, Ga, etc.)
}

export interface Scale {
  notes: Record<string, string>;  // Maps note symbols to their full names
}

export interface Note {
  sur?: string;      // The musical note (S, R, G, etc.)
  lyrics?: string;   // Optional lyrics
  octave?: 'lower' | 'middle' | 'upper';  // Octave information
  isSpecial?: boolean;  // For special characters like '-' (silence) or '*' (sustain)
}

export interface Beat {
  position: {
    row: number;
    beat_number: number;
  };
  notes: Note[];
}

export interface Section {
  name: string;
  beats: Beat[];
}

export interface Composition {
  sections: Section[];
}

export interface SurDocument {
  metadata: SurMetadata;
  scale: Scale;
  composition: Composition;
}
