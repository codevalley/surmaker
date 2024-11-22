from typing import List, Optional
from .models import Note, NotePitch, Element, Beat, Section, SURFile

class SURParser:
    def __init__(self):
        self.current_section = None
        
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
    
    def _split_beats(self, line: str) -> List[str]:
        """Split a line into beats, properly handling bracketed content"""
        result = []
        current = ""
        bracket_count = 0
        
        for char in line:
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
            
            if char.isspace() and bracket_count == 0:
                if current:
                    result.append(current)
                current = ""
            else:
                current += char
        
        if current:
            result.append(current)
            
        return result

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

    def _parse_element(self, text: str) -> Element:
        """Parse a single element from text - each element is atomic (one note or one lyric)"""
        # Handle special notes
        if text in ["-", "*"]:
            return Element(note=self._parse_single_note(text))
            
        # Handle single note with octave
        if text[0] in "SRGMPDN" and all(c in "'," for c in text[1:]):
            return Element(note=self._parse_single_note(text))
            
        # Handle single note
        if text in "SRGMPDN":
            return Element(note=self._parse_single_note(text))
            
        # Otherwise it's lyrics
        return Element(lyrics=text)

    def _parse_beat(self, text: str) -> Beat:
        """Parse a beat from text"""
        text = text.strip()
        if not text:
            return Beat()
            
        # Handle bracketed content
        if text.startswith("[") and text.endswith("]"):
            content = text[1:-1].strip()
            elements = []
            
            # Split on spaces first to handle [al GG] case
            parts = content.split()
            
            for part in parts:
                if ":" in part:  # lyrics:note format like 'al:G'
                    lyrics, note = part.split(":", 1)
                    # Handle each note as a separate element
                    for c in note:
                        if c in "SRGMPDN-*":
                            elements.append(Element(note=self._parse_single_note(c)))
                    elements.append(Element(lyrics=lyrics.strip()))
                elif any(c.islower() for c in part):  # lyrics
                    elements.append(Element(lyrics=part))
                else:  # notes
                    # Each character is a separate note
                    for c in part:
                        if c in "SRGMPDN-*":
                            elements.append(Element(note=self._parse_single_note(c)))
            
            return Beat(elements=elements)
                
        # Handle consecutive notes (e.g., "GG")
        if all(c in "SRGMPDN-*" for c in text):
            elements = [Element(note=self._parse_single_note(c)) for c in text]
            return Beat(elements=elements)
            
        # Handle single note/silence/sustain
        return Beat(elements=[self._parse_element(text)])

    def parse_line(self, line: str) -> List[Beat]:
        """Parse a line of input into multiple beats"""
        beats = []
        
        # Split line into beats, properly handling brackets
        components = self._split_beats(line)
        
        # Parse each component as a beat
        for comp in components:
            beats.append(self._parse_beat(comp))
            
        return beats

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
        
        return Section(title=title, beats=beats)