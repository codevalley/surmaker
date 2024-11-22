from typing import List, Dict, Tuple
from .models import Note, Beat, Section, SURFile, NoteOctave
import re

class SURParser:
    def __init__(self):
        self.current_section = None
        
    def parse_file(self, content: str) -> SURFile:
        sections = content.split("@")
        metadata = self._parse_config(sections[0])
        scale = self._parse_scale(sections[1])
        composition = self._parse_composition(sections[2])
        
        return SURFile(metadata, scale, composition)
    
    def _parse_config(self, config_section: str) -> Dict[str, str]:
        metadata = {}
        for line in config_section.strip().split("\n"):
            if ":" in line and not line.strip().startswith("//"):
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip().strip('"')
        return metadata
    
    def _parse_scale(self, scale_section: str) -> Dict[str, str]:
        scale = {}
        for line in scale_section.strip().split("\n"):
            if "->" in line and not line.strip().startswith("//"):
                note, name = line.split("->", 1)
                scale[note.strip()] = name.strip()
        return scale
    
    def _parse_composition(self, comp_section: str) -> List[Section]:
        sections = []
        current_section = None
        current_beats = []
        
        for line in comp_section.strip().split("\n"):
            line = line.strip()
            if not line or line.startswith("//"):
                continue
                
            if line.startswith("#"):
                if current_section:
                    sections.append(Section(current_section, current_beats))
                current_section = line[1:].strip()
                current_beats = []
            elif line.startswith("b:"):
                beats = self._parse_beats(line[2:].strip())
                current_beats.extend(beats)
        
        if current_section:
            sections.append(Section(current_section, current_beats))
            
        return sections
    
    def _parse_beats(self, beat_line: str) -> List[Beat]:
        """Parse a line of beats into Beat objects"""
        beats = []
        # Updated regex to better handle bracketed content
        tokens = re.findall(r'\[.*?\]|[^\s]+', beat_line)
        
        for token in tokens:
            if token == "-":
                beats.append(Beat([], is_silence=True))
            elif token == "*":
                beats.append(Beat([], is_sustain=True))
            else:
                # Handle bracketed content
                is_bracketed = token.startswith("[") and token.endswith("]")
                if is_bracketed:
                    token = token[1:-1].strip()  # Remove brackets and whitespace
                
                if ":" in token:
                    lyrics, notes = token.split(":", 1)
                    beats.append(Beat(
                        self._parse_notes(notes.strip()), 
                        lyrics=lyrics.strip('"')
                    ))
                else:
                    beats.append(Beat(self._parse_notes(token.strip())))
        
        return beats
    
    def _parse_notes(self, notes_str: str) -> List[Note]:
        notes = []
        i = 0
        while i < len(notes_str):
            if notes_str[i] == ".":
                notes.append(Note(notes_str[i+1], NoteOctave.LOWER))
                i += 2
            elif i < len(notes_str) - 1 and notes_str[i+1] == "'":
                notes.append(Note(notes_str[i], NoteOctave.UPPER))
                i += 2
            else:
                notes.append(Note(notes_str[i]))
                i += 1
        return notes 