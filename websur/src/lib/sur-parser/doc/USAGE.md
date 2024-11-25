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

## Builder Pattern

The library provides a fluent builder interface for programmatically creating SureScript documents:

```typescript
import { SurDocumentBuilder, NotePitch } from 'sur-parser';

// Create a new document using the builder
const doc = new SurDocumentBuilder()
  // Add metadata
  .addMetadata('name', 'My Composition')
  .addMetadata('raag', 'Bhoop')
  .addMetadata('taal', 'teental')
  
  // Add scale notes
  .addScaleNote(NotePitch.S, 'Sa')
  .addScaleNote(NotePitch.R, 'Re')
  .addScaleNote(NotePitch.G, 'Ga')
  .addScaleNote(NotePitch.P, 'Pa')
  
  // Create sections and beats
  .startSection('Sthayi')
  .startBeat({ row: 0, beat_number: 0 })
  .addNote(NotePitch.S, { octave: 0 })
  .addNote(NotePitch.R, { octave: 0 })
  .startBeat({ row: 0, beat_number: 1 })
  .addRest()  // Add a rest beat
  .startBeat({ row: 0, beat_number: 2 })
  .addNote(NotePitch.G, { octave: 1, lyrics: 'ga' })  // Note with lyrics in upper octave
  .build();
```

The builder provides several convenience methods:

### Metadata Management
```typescript
// Add individual metadata
builder.addMetadata('name', 'Composition Name');

// Set multiple metadata values at once
builder.setMetadata({
  name: 'Composition Name',
  raag: 'Bhoop',
  taal: 'teental',
  tempo: 'madhya'
});
```

### Scale Definition
```typescript
// Add individual scale notes
builder.addScaleNote(NotePitch.S, 'Sa');

// Set entire scale at once
builder.setScale({
  [NotePitch.S]: 'Sa',
  [NotePitch.R]: 'Re',
  [NotePitch.G]: 'Ga',
  [NotePitch.M]: 'Ma',
  [NotePitch.P]: 'Pa',
  [NotePitch.D]: 'Dha',
  [NotePitch.N]: 'Ni'
});
```

### Composition Building
```typescript
builder
  .startSection('Sthayi')
  // Add a beat with a note and lyrics
  .startBeat({ row: 0, beat_number: 0 })
  .addNote(NotePitch.S, { 
    octave: 0,        // 0: middle, 1: upper, -1: lower
    lyrics: 'sa'
  })
  // Add a rest beat
  .startBeat({ row: 0, beat_number: 1 })
  .addRest()
  // Add a sustained note
  .startBeat({ row: 0, beat_number: 2 })
  .addSustain()
  // Add lyrics without a note
  .startBeat({ row: 0, beat_number: 3 })
  .addLyrics('text');
```

## Utility Functions

The library includes the `SurDocumentUtils` class with helpful static methods for common operations:

### Converting Between String and Document

```typescript
import { SurDocumentUtils } from 'sur-parser';

// Parse SureScript content to document
const content = `
%% CONFIG
name: "Example"
raag: "bhoop"

%% SCALE
S -> Sa
R -> Re

%% COMPOSITION
#Section1
b: [S R][G P]
`;

const doc = SurDocumentUtils.fromString(content);

// Convert document back to string
const outputContent = SurDocumentUtils.toString(doc);
```

### Document Validation

```typescript
import { SurDocumentUtils } from 'sur-parser';

try {
  SurDocumentUtils.validate(doc);
  console.log('Document is valid');
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

The validator checks for:
- Required metadata fields
- Scale note definitions
- Section structure
- Beat positions
- And more...

## Error Handling

Always wrap document operations in try-catch blocks to handle potential errors:

```typescript
try {
  const doc = new SurDocumentBuilder()
    .addMetadata('name', 'My Composition')
    .addScaleNote(NotePitch.S, 'Sa')
    .startSection('Sthayi')
    .startBeat({ row: 0, beat_number: 0 })
    .addNote(NotePitch.S)
    .build();
} catch (error) {
  console.error('Failed to build document:', error.message);
}
```

Common errors include:
- Missing required metadata
- Empty scale definitions
- Invalid note pitches
- Missing section title
- Invalid beat positions

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
