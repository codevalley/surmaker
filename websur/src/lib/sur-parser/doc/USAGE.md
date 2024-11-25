# Sur Parser Usage Guide

This guide provides detailed examples and best practices for using the Sur Parser library in your projects.

## Installation

```bash
npm install sur-parser
# or
yarn add sur-parser
```

## Basic Usage

### Parsing a SureScript File

```typescript
import { SurParser } from 'sur-parser';
import { SurDocument } from 'sur-parser/types';

const parser = new SurParser();

// Parse from string content
const content = `
%% CONFIG
name: "Example Composition"
raag: "bhoop"

%% SCALE
S -> Sa
R -> Re
G -> Ga
P -> Pa

%% COMPOSITION
#Section1
b: [S R G P]
`;

const document: SurDocument = parser.parse(content);
```

### Working with Parsed Document

```typescript
// Accessing metadata
console.log(document.metadata.name);    // "Example Composition"
console.log(document.metadata.raag);    // "bhoop"

// Working with scale
const scale = document.scale;
console.log(scale.notes['S']);         // "Sa"

// Accessing composition
const composition = document.composition;
const firstSection = composition.sections[0];
console.log(firstSection.name);        // "Section1"

// Working with beats
const firstBeat = firstSection.beats[0];
console.log(firstBeat.notes);          // Array of notes
```

## Advanced Usage

### Working with Notes and Octaves

```typescript
// Parsing content with different octaves
const content = `
%% COMPOSITION
#Section1
b: [S' R G .P]  // Upper Sa, middle Re and Ga, lower Pa
`;

const document = parser.parse(content);
const note = document.composition.sections[0].beats[0].notes[0];

// Check note octave
if (note.octave === 'upper') {
    console.log('Note is in upper octave');
}
```

### Handling Compound Notes

```typescript
// Content with compound notes
const content = `
%% COMPOSITION
#Section1
b: [SRG]  // Three notes played together
`;

const document = parser.parse(content);
const beat = document.composition.sections[0].beats[0];

// Check if note is compound
if (beat.notes[0].compound) {
    console.log('This is a compound note');
    beat.notes[0].compound.forEach(note => {
        console.log(`Note: ${note.sur}, Octave: ${note.octave}`);
    });
}
```

### Working with Lyrics

```typescript
// Content with lyrics
const content = `
%% COMPOSITION
#Section1
b: [sa:S re:R]  // Notes with lyrics
`;

const document = parser.parse(content);
const note = document.composition.sections[0].beats[0].notes[0];

// Access lyrics
if (note.lyrics) {
    console.log(`Lyric: ${note.lyrics}`);
}
```

## Type Definitions

### Key Interfaces

```typescript
interface SurDocument {
    metadata: SurMetadata;
    scale: Scale;
    composition: Composition;
}

interface Scale {
    notes: Record<string, string>;
}

interface Section {
    name: string;
    beats: Beat[];
}

interface Beat {
    position: {
        row: number;
        beat_number: number;
    };
    notes: Note[];
}

interface Note {
    lyrics?: string;
    isSpecial?: boolean;
    sur?: string;
    octave?: 'upper' | 'middle' | 'lower';
    compound?: Array<{ sur: string; octave: 'upper' | 'middle' | 'lower' }>;
    mixed?: Array<Note>;
}
```

## Best Practices

1. **Error Handling**: Always wrap parser calls in try-catch blocks
   ```typescript
   try {
       const document = parser.parse(content);
   } catch (error) {
       console.error('Failed to parse SureScript:', error);
   }
   ```

2. **Type Safety**: Use TypeScript interfaces for better type safety
   ```typescript
   import { SurDocument, Note, Beat } from 'sur-parser/types';
   ```

3. **Validation**: Validate the document structure after parsing
   ```typescript
   if (document.composition.sections.length === 0) {
       console.warn('Composition has no sections');
   }
   ```

## Common Patterns

### Processing All Notes in a Composition

```typescript
function processAllNotes(document: SurDocument) {
    document.composition.sections.forEach(section => {
        section.beats.forEach(beat => {
            beat.notes.forEach(note => {
                // Process each note
                processNote(note);
            });
        });
    });
}
```

### Creating a Simple Validator

```typescript
function validateDocument(document: SurDocument): boolean {
    // Check required metadata
    if (!document.metadata.name || !document.metadata.raag) {
        return false;
    }

    // Check scale definitions
    if (Object.keys(document.scale.notes).length === 0) {
        return false;
    }

    // Check composition structure
    if (document.composition.sections.length === 0) {
        return false;
    }

    return true;
}
```
