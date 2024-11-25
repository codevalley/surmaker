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
- Upper octave (taar saptak): `S' R' G' M' P' D' N'`  // Note with apostrophe after
- Lower octave (mandra saptak): `S. R. G. M. P. D. N.`  // Note with dot after

Examples:
```
S           // Sa in middle octave
S'          // Sa in upper octave (taar saptak)
S.          // Sa in lower octave (mandra saptak)
[S P.]      // Sa in middle octave with Pa in lower octave
[S' G P]    // Sa in upper octave with Ga and Pa in middle octave
```

- **Single Notes**: Individual notes in any octave
  ```
  S     // Sa (middle)
  R'    // Re (upper)
  G.    // Ga (lower)
  ```

- **Compound Notes**: Multiple notes played together in a single beat
  ```
  [SRP]   // All notes in middle octave
  [S'RP.] // Sa in upper, Re in middle, Pa in lower octave
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

## Notation Simplification

SureScript follows the principle of using the simplest possible notation that preserves the musical meaning. When multiple equivalent notations are possible, prefer the simpler form.

### 1. Basic Simplification Rules

- Prefer no brackets over brackets when possible
- Prefer no quotes around lyrics when possible
- Prefer compound notes without spaces
- Only use brackets/quotes when needed to preserve meaning

### 2. Equivalent Notations (Simplest First)

#### Simple Notes and Compounds
1. `SRG`         // Simplest - compound notes without brackets
2. `[SRG]`       // Same meaning, but with unnecessary brackets
3. `[SR G]`      // Same meaning, but with unnecessary space and brackets
4. `[S R G]`     // Most verbose form

#### Notes with Lyrics
1. `[SRG man]`   // Simplest - compound notes with unquoted lyrics
2. `[SRG "man"]` // Same, but with unnecessary quotes
3. `SRG"man"`    // Alternative form, acceptable but less clear
4. `[S R G man]` // Most verbose form

#### Lyrics with Specific Notes
1. `[man:G G G]` // Lyrics attached to first G, followed by two G's
2. `["man":G G G]` // Same, but with unnecessary quotes
3. `[man:GGG]`   // Different meaning! All notes attached to lyrics

#### Compound Notes with Silence
1. `SR-G`        // Simplest - compound with embedded silence
2. `[SR-G]`      // Same, but with unnecessary brackets
3. `[S R - G]`   // Most verbose form

### 3. When to Use Complex Notation

Use more complex notation only when needed to preserve meaning:

1. Use brackets when:
   - Mixing lyrics and notes in one beat
   - Specifying which notes lyrics attach to
   - Representing complex patterns with silence/sustain

2. Use quotes when:
   - Lyrics contain special characters
   - Lyrics could be confused with notes
   - Lyrics contain spaces

3. Use spaces when:
   - Showing explicit separation between notes
   - Making complex patterns more readable
   - Indicating specific timing within a beat

### 4. Examples of Proper Simplification

```
// Simple notes
SRG         ✓ (preferred)
[SRG]       ✗ (unnecessary brackets)
[S R G]     ✗ (unnecessary brackets and spaces)

// Notes with lyrics
[SRG man]   ✓ (preferred)
[SRG "man"] ✗ (unnecessary quotes)
[S R G man] ✗ (unnecessary spaces)

// Lyrics with specific notes
[man:G G G] ✓ (preferred - lyrics with first G)
[man:GGG]   ✓ (different meaning - lyrics with all notes)
["man":G G G] ✗ (unnecessary quotes)

// Compound with silence
SR-G        ✓ (preferred)
[SR-G]      ✗ (unnecessary brackets)
[S R - G]   ✗ (unnecessary brackets and spaces)
```

Note: The doctor command in SureScript tools should automatically convert more complex notations to their simplest equivalent form when the meaning is preserved.

## Bracket Precedence and Parsing

Brackets `[]` in SureScript serve as beat delimiters and should be parsed first, similar to how parentheses work in arithmetic (BODMAS). This helps in disambiguating complex musical patterns.

### 1. Parsing Order

1. First level: Identify beats by brackets `[]`
2. Second level: Within each bracketed beat, parse:
   - Lyrics with notes (using `:`)
   - Compound notes
   - Silence (`-`)
   - Sustain (`*`)

### 2. Examples of Parsing Strategy

```
// Simple cases (no brackets needed)
b: SRG         // Single compound note
b: S - G       // Three distinct beats

// Complex cases (brackets required)
b: [SRG man]   // Single beat: compound notes with lyrics
b: [S:aa R:ee] // Single beat: multiple note-lyric pairs

// Mixed cases
b: SRG [P:aa D:ee] MG  // Three beats:
                       // 1. compound notes SRG
                       // 2. bracketed beat with lyrics
                       // 3. compound notes MG

// Nested elements
b: [SRG man] - [P:aa D N]  // Three beats:
                           // 1. compound with lyrics
                           // 2. silence
                           // 3. notes with first note having lyrics
```

### 3. When Brackets Are Required

Brackets must be used when a single beat contains any of:
1. Multiple note-lyric pairs
2. Mixed compound notes and lyrics
3. Complex patterns that could be ambiguous
4. Specific timing within a beat

### 4. Parsing Rules

1. Everything within `[]` is treated as a single beat
2. Within a beat:
   - `note:lyric` pairs are processed first
   - Remaining notes are grouped
   - Remaining lyrics are attached to the entire beat
3. Outside brackets:
   - Each space-separated element is a beat
   - Simple compound notes (SRG) are kept together
   - Silence (-) and sustain (*) are separate beats

### 5. Examples with Parsing Steps

```
Input: [SRG man] - [P:aa D N]

Parsing steps:
1. Identify beats by brackets:
   - Beat 1: [SRG man]
   - Beat 2: -
   - Beat 3: [P:aa D N]

2. Parse each beat:
   Beat 1: [SRG man]
   - No note:lyric pairs
   - Notes: SRG (compound)
   - Lyrics: man (applies to all notes)

   Beat 2: -
   - Single silence

   Beat 3: [P:aa D N]
   - Note:lyric pair: P:aa
   - Remaining notes: D N
```

### 6. Implementation Note

When implementing a parser for SureScript:
1. First split the line into beats using brackets as delimiters
2. For each beat:
   - If bracketed, parse internal components
   - If unbracketed, apply simple beat rules
3. Apply simplification rules only after parsing is complete
4. Preserve the original meaning when simplifying notation

This parsing strategy ensures consistent interpretation of complex musical patterns while allowing for simplified notation where possible.
