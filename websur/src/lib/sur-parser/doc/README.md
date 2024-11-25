# Sur Parser Library

A TypeScript library for parsing and processing SureScript (.sur) files, specifically designed for Indian classical music notation.

## Overview

Sur Parser is a specialized library that handles the parsing and processing of SureScript files. SureScript is a human-readable format for representing Indian classical music compositions, making it easy to write, share, and process musical scores.

## Features

- Parse SureScript (.sur) files into structured TypeScript objects
- Support for complete musical composition structure:
  - Metadata (raag, taal, tempo, etc.)
  - Scale definitions with note mappings
  - Full composition with sections, beats, and notes
- Handle complex musical notations:
  - Multiple octaves (lower, middle, upper)
  - Compound notes
  - Lyrics integration
  - Special notations and markers

## About SureScript

SureScript is a plain text format designed for Indian classical music notation. It consists of three main sections:

1. **CONFIG**: Contains metadata about the composition
   ```
   %% CONFIG
   name: "Albela Sajan"
   raag: "bhoopali"
   taal: "teental"
   ```

2. **SCALE**: Defines the musical scale and note mappings
   ```
   %% SCALE
   S -> Sa
   R -> Re
   G -> Ga
   ```

3. **COMPOSITION**: Contains the actual musical composition
   ```
   #Sthayi
   b: [S R G M][-][P D N S']
   ```

For detailed SureScript specification, please refer to the project's [surescript.md](../../surescript.md).

## Installation

```bash
npm install sur-parser
# or
yarn add sur-parser
```

## Quick Start

```typescript
import { SurParser } from 'sur-parser';

const parser = new SurParser();
const surContent = `
%% CONFIG
name: "Simple Composition"
raag: "bhoop"

%% SCALE
S -> Sa
R -> Re
G -> Ga
P -> Pa

%% COMPOSITION
#Section1
b: [S R G P][G R S -]
`;

const parsedDocument = parser.parse(surContent);
console.log(parsedDocument.metadata.name); // "Simple Composition"
```

## Documentation

- [Usage Guide](./USAGE.md) - Detailed usage instructions and examples
- [Todo List](./todo.md) - Upcoming features and improvements

## License

MIT License
