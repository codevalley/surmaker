export enum NotePitch {
  S = 'S',
  R = 'R',
  G = 'G',
  M = 'M',
  P = 'P',
  D = 'D',
  N = 'N',
  SILENCE = '-',
  SUSTAIN = '*'
}

export enum NoteVariant {
  SHUDHA = 'SHUDHA',
  KOMAL = 'KOMAL',
  TIVRA = 'TIVRA'
}

export enum TokenType {
  NOTE = 'NOTE',
  LYRICS = 'LYRICS',
  COLON = 'COLON',
  OPEN_BRACKET = 'OPEN_BRACKET',
  CLOSE_BRACKET = 'CLOSE_BRACKET',
  SEPARATOR = 'SEPARATOR'
}

export enum ElementType {
  NORMAL = 'NORMAL',
  SEPARATOR = 'SEPARATOR',
  OPEN_BRACKET = 'OPEN_BRACKET',
  CLOSE_BRACKET = 'CLOSE_BRACKET'
}

export interface Token {
  type: TokenType;
  value: string;
}

export interface Note {
  pitch: NotePitch;
  octave?: number;
}

export interface Element {
  lyrics?: string;
  note?: Note;
}

export interface Beat {
  elements: Element[];
}

export interface Section {
  title: string;
  beats: Beat[];
}

export interface Composition {
  sections: Section[];
}

export interface Scale {
  [key: string]: string;
}

export interface SurMetadata {
  [key: string]: string;
}

export interface SurDocument {
  metadata: SurMetadata;
  scale: Scale;
  composition: Composition;
}

export interface ParsingElement extends Element {
  type: ElementType;
}
