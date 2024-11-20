# SureScript Specification

SureScript is a simple, human-readable format for representing musical compositions, particularly suited for Indian classical music. It allows musicians to write and share compositions using plain text, making it easy to create, edit, and share music.

## Document Structure

A SureScript document consists of three main modules:
1. CONFIG - Configuration settings
2. SCALE - Scale definitions
3. COMPOSITION - The actual musical composition

### Module Headers

Modules are declared using either `%%` or `@` (without any spaces):

```
%%CONFIG
@SCALE
@COMPOSITION
```

Note: The `%%` vs `@` syntax only applies to module headers. Properties within modules use their specific syntax (`:` for CONFIG, `->` for SCALE).

## Basic Building Blocks

### 1. Notes

Notes are represented using UPPERCASE letters only: S R G M P D N

Notes can be in different octaves:
- Default scale (madhya saptak): `S R G M P D N`
- Upper octave (taar saptak): `S' R' G' M' P' D' N'`
- Lower octave (mandra saptak): `.S .R .G .M .P .D .N`

Examples:
```
S           // Sa in middle octave
S'          // Sa in upper octave
.S          // Sa in lower octave
[S .P]      // Sa in middle octave with Pa in lower octave
[S' G P]    // Sa in upper octave with Ga and Pa in middle octave
```

- **Single Notes**: Individual notes in any octave
  ```
  S     // Sa (middle)
  R'    // Re (upper)
  .G    // Ga (lower)
  ```

- **Compound Notes**: Multiple notes played together in a single beat
  ```
  SRG           // Notes in middle octave
  S'RG          // Sa in upper, Re and Ga in middle
  [S R' .G]     // Notes in different octaves
  ```

### 2. Lyrics

Lyrics are represented in lowercase, with or without quotes:

```
sa          // Simple lyrics
"sa"        // Quoted lyrics
mora        // Word
"mora"      // Quoted word
```

When attaching a note to lyrics, use colon:
```
"sa":S      // Lyric with note
"mora":P    // Word with note
```

### 3. Silence

Silence is represented by a hyphen (`-`):

```
-           // Single beat silence
[- S - -]   // Multiple silences in one beat, with a note
```

### 4. Sustain

Sustain (extending previous note/lyric) is represented by an asterisk (`*`):

```
S * * *     // Hold Sa for four beats
[S * * *]   // Hold Sa within one beat
```

### 5. Beat

A beat is the basic unit of timing. It can contain:
- Single note/lyric
- Compound notes
- Combination of notes, lyrics, silence, and sustain

Beats can be explicit (using brackets) or implicit (without spaces):

```
// Single beat examples
SRG         // Compound notes as one beat
[S R G]     // Same compound notes with spaces
[sa:S - -]  // Lyric with note and silence
```

### 6. Rhythm (Taal)

A taal consists of fixed number of beats, represented as a single line in the composition:

```
// Teental (16 beats)
b: S - R - G - M - P - D - N - S' -    // Simple notes
b: "sa":S - "re":R - "ga":G - "ma":M -  // Lyrics with notes
```

### 7. Section Headers

Section headers are marked with a `#` prefix and help organize different parts of the composition:
```
#Sthayi    // First section
#Antara    // Second section
#Sanchari  // Third section
```

## Combinations and Examples

### 1. Notes with Lyrics

```
// Different ways to combine notes and lyrics
b: "sa":S           // Basic combination
b: ["sa":S]         // In brackets
b: [sa:S]           // Without quotes
```

### 2. Complex Beat Patterns

```
// Mixing notes, lyrics, silence, and sustain
b: [sa:S] [re:R] [ga:G]                 // Simple pattern
b: ["sa":S] - ["re":R] -                // With silence
b: [sa:S * *] [re:R * *]                // With sustain
b: [SRG] ["mora":P] - [sa:N]            // Mixed elements
```

### 3. Full Composition Example

```
%%CONFIG
name: "Albela Sajan"  // Name of the composition
raag: "aahir bhairav" // Raag
taal: "teental"       // Taal
beats_per_row: "16"   // Beats per line
tempo: "drut"         // Speed

%%SCALE  // Scale definition
S -> Sa
r -> Komal Re
R -> Shuddha Re
g -> Komal Ga
G -> Shuddha Ga
m -> Shuddha Ma
M -> Teevra Ma
P -> Pa
d -> Komal Dha
D -> Shuddha Dha
n -> Komal Ni
N -> Shuddha Ni

// Main composition starts here
@COMPOSITION
#Sthayi  // First section
b: - - - - - - ["al":S] ["be":R]        // First line
b: [SRG] - ["mo":P] ["ra":D] [sa:N]     // Compound notes and lyrics
b: ["aa":S] * ["oo":R] - ["re":G] -     // With sustain
```

## Supported Taals

The following taals are supported with their respective beat patterns:

- Teental: 16 beats (4+4+4+4)
- Jhaptaal: 10 beats (2+3+2+3)
- Ektaal: 12 beats (2+2+2+2+2+2)
- Rupak: 7 beats (3+2+2)
- Keherwa: 8 beats (4+4)

## Case Sensitivity

SureScript is case-sensitive by default:
- UPPERCASE letters (S R G M P D N) represent notes
- lowercase or mixed case letters represent lyrics
- Commands and module headers (CONFIG, SCALE, COMPOSITION) can be in any case

## Comments

Everything after `//` on a line is treated as a comment and will be ignored:
```
b: S R G M  // This entire part is a comment
// This whole line is a comment
b: [albe:S -]  // Comments can explain the beat
%%CONFIG  // Even module headers can have comments
```

## Best Practices

1. Use UPPERCASE for notes and lowercase for lyrics
2. Be consistent with your notation style within a composition
3. Use comments to explain complex patterns
4. Align beats for better readability
5. Use appropriate spacing within beats
6. Choose the most readable format for your use case

## File Format

- Files should use UTF-8 encoding
- Line endings can be either LF or CRLF
- File extension should be `.sur`
