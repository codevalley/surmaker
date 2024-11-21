export interface SurMetadata {
  [key: string]: string;
}

export interface ScaleNote {
  symbol: string;  // The note symbol (S, R, G, etc.)
  name: string;    // The full name (Sa, Re, Ga, etc.)
}

export interface Scale {
  notes: Record<string, string>;  // Maps note symbols to their full names
}

export type Note = {
  lyrics?: string;
  isSpecial?: boolean;
  sur?: string;
  octave?: 'upper' | 'middle' | 'lower';
  compound?: Array<{ sur: string; octave: 'upper' | 'middle' | 'lower' }>;
  mixed?: Array<Note>;
};

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
