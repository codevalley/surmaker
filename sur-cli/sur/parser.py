from typing import List, Optional
from enum import Enum, auto
import re
from .models import Note, NotePitch, Element, ElementType, Beat, Section, SURFile

class TokenType(Enum):
    NOTE = auto()
    LYRICS = auto()
    COLON = auto()
    OPEN_BRACKET = auto()
    CLOSE_BRACKET = auto()
    SEPARATOR = auto()

class Token:
    def __init__(self, tok_type: TokenType, value: str):
        self.type = tok_type
        self.value = value
    
    def __str__(self):
        return f"Token({self.type}, {repr(self.value)})"

class SURParser:
    def __init__(self):
        self.current_section = None
        
        # Regex patterns for tokenization
        self._note_pattern = r"(?:\.|,)*[SRGMPDN](?:'|,)*|-|\*"  # Matches .S, S', S, etc. and - *
        self._quoted_lyrics = r'"[^"]*"'  # Matches anything in quotes
        self._symbols = r"[\[\]:]"  # Matches brackets and colon
        self._separator = r"\s+"  # Matches whitespace
        self._mixed_text = r"[a-zA-Z][a-zA-Z0-9]*"  # Matches text without spaces/symbols
        
        # Combined pattern
        self._token_pattern = f"({self._quoted_lyrics})|({self._note_pattern})|({self._symbols})|({self._separator})|({self._mixed_text})"
        self._token_regex = re.compile(self._token_pattern)
    
    def _tokenize(self, text: str) -> List[Token]:
        """Convert input string into tokens"""
        tokens = []
        for match in self._token_regex.finditer(text):
            quoted, note, symbol, separator, mixed = match.groups()
            
            if quoted:
                # Remove quotes and create lyrics token
                tokens.append(Token(TokenType.LYRICS, quoted[1:-1]))
            elif note:
                tokens.append(Token(TokenType.NOTE, note))
            elif symbol:
                if symbol == '[':
                    tokens.append(Token(TokenType.OPEN_BRACKET, symbol))
                elif symbol == ']':
                    tokens.append(Token(TokenType.CLOSE_BRACKET, symbol))
                else:  # symbol == ':'
                    tokens.append(Token(TokenType.COLON, symbol))
            elif separator:
                tokens.append(Token(TokenType.SEPARATOR, separator))
            elif mixed:
                tokens.append(Token(TokenType.LYRICS, mixed))
        
        print("Tokens:", [str(t) for t in tokens])  # Debug output
        return tokens
    
    def _tokens_to_elements(self, tokens: List[Token]) -> List[Element]:
        """Convert tokens to elements"""
        elements = []
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            if token.type == TokenType.SEPARATOR:
                elements.append(Element(type=ElementType.SEPARATOR))
                i += 1
            elif token.type == TokenType.OPEN_BRACKET:
                elements.append(Element(type=ElementType.OPEN_BRACKET))
                i += 1
            elif token.type == TokenType.CLOSE_BRACKET:
                elements.append(Element(type=ElementType.CLOSE_BRACKET))
                i += 1
            elif token.type == TokenType.NOTE:
                # Single note element
                elements.append(Element(note=self._parse_single_note(token.value)))
                i += 1
            elif token.type == TokenType.LYRICS:
                if i + 2 < len(tokens) and tokens[i+1].type == TokenType.COLON and tokens[i+2].type == TokenType.NOTE:
                    # lyrics:note pattern
                    elements.append(Element(
                        lyrics=token.value,
                        note=self._parse_single_note(tokens[i+2].value)
                    ))
                    i += 3
                else:
                    # Just lyrics
                    elements.append(Element(lyrics=token.value))
                    i += 1
            else:
                i += 1
        
        print("Elements:", [str(e) for e in elements])  # Debug output
        return elements
    
    def _elements_to_beats(self, elements: List[Element]) -> List[Beat]:
        """Convert elements to beats based on brackets and separators"""
        beats = []
        current_elements = []
        bracket_elements = []
        in_bracket = False
        last_was_separator = True  # Start true to handle first element
        
        def create_beat(elems, bracketed=False):
            if elems:
                beats.append(Beat(
                    elements=[e for e in elems if e.type == ElementType.NORMAL],
                    bracketed=bracketed
                ))
        
        for element in elements:
            if element.type == ElementType.SEPARATOR:
                if not in_bracket and current_elements:
                    create_beat(current_elements)
                    current_elements = []
                last_was_separator = True
            elif element.type == ElementType.OPEN_BRACKET:
                # First finish any pending beat
                if current_elements:
                    create_beat(current_elements)
                    current_elements = []
                in_bracket = True
                bracket_elements = []
            elif element.type == ElementType.CLOSE_BRACKET:
                in_bracket = False
                # Create beat from bracketed elements
                if bracket_elements:
                    create_beat(bracket_elements, bracketed=True)
                bracket_elements = []
                last_was_separator = True
            else:  # Normal element
                if in_bracket:
                    bracket_elements.append(element)
                else:
                    current_elements.append(element)
                last_was_separator = False
        
        # Handle any remaining elements
        if current_elements:
            create_beat(current_elements)
        
        print("Beats:", [str(b) for b in beats])  # Debug output
        return beats
    
    def parse_line(self, line: str) -> List[Beat]:
        """Parse a line into beats using tokenization"""
        tokens = self._tokenize(line)
        elements = self._tokens_to_elements(tokens)
        return self._elements_to_beats(elements)
    
    def _parse_single_note(self, text: str) -> Optional[Note]:
        """Parse a single note from text"""
        if not text:
            return None
            
        # Handle special notes (silence and sustain)
        if text == "-":
            return Note(pitch=NotePitch.SILENCE)
        if text == "*":
            return Note(pitch=NotePitch.SUSTAIN)
        
        # Parse octave
        octave = 0
        while text.endswith("'"):
            octave += 1
            text = text[:-1]
        while text.endswith(","):
            octave -= 1
            text = text[:-1]
        
        # Parse pitch
        try:
            pitch = NotePitch(text)
        except ValueError:
            raise ValueError(f"Invalid note pitch: {text}")
            
        return Note(pitch=pitch, octave=octave)

    def parse_file(self, content: str) -> SURFile:
        sections = content.split("@")
        metadata = self._parse_config(sections[0])
        scale = self._parse_scale(sections[1])
        composition = self.parse(sections[2])
        
        return SURFile(metadata, scale, composition)
    
    def _parse_config(self, config_section: str) -> dict[str, str]:
        metadata = {}
        for line in config_section.strip().split("\n"):
            if ":" in line and not line.strip().startswith("//"):
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip().strip('"')
        return metadata
    
    def _parse_scale(self, scale_section: str) -> dict[str, str]:
        scale = {}
        for line in scale_section.strip().split("\n"):
            if "->" in line and not line.strip().startswith("//"):
                note, name = line.split("->", 1)
                scale[note.strip()] = name.strip()
        return scale
    
    def parse(self, content: str) -> List[Section]:
        """Parse a SUR file from string content"""
        lines = content.splitlines()
        
        # Initialize empty SUR file
        composition = []
        
        # Parse sections
        current_section_lines = []
        for line in lines:
            if line.startswith("#") and current_section_lines:
                # Parse previous section
                section = self._parse_section(current_section_lines)
                if section:
                    composition.append(section)
                current_section_lines = []
            current_section_lines.append(line)
            
        # Parse final section
        if current_section_lines:
            section = self._parse_section(current_section_lines)
            if section:
                composition.append(section)
        
        return composition

    def _parse_section(self, lines: List[str]) -> Optional[Section]:
        """Parse a section from lines of text"""
        if not lines or not lines[0].startswith("#"):
            return None
            
        # Parse title
        title = lines[0][1:].strip()
        
        # Parse beats
        beats = []
        for line in lines[1:]:
            line = line.strip()
            if line.startswith("#"):
                break
            if not line:
                continue
                
            # Parse each line into beats
            beats.extend(self.parse_line(line))
        
        print("Section:", f"Section(title={title}, beats={beats})")  # Debug output
        return Section(title=title, beats=beats)