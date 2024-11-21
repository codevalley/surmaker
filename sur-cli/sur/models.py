from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum

class NoteOctave(Enum):
    LOWER = "LOWER"
    MIDDLE = "MIDDLE"
    UPPER = "UPPER"

@dataclass
class Note:
    pitch: str  # S, R, G, M, P, D, N
    octave: NoteOctave = NoteOctave.MIDDLE
    
    def __str__(self):
        if self.octave == NoteOctave.LOWER:
            return f".{self.pitch}"
        elif self.octave == NoteOctave.UPPER:
            return f"{self.pitch}'"
        return self.pitch

@dataclass
class Beat:
    notes: List[Note]
    lyrics: Optional[str] = None
    is_silence: bool = False
    is_sustain: bool = False
    
    def __str__(self):
        if self.is_silence:
            return "-"
        if self.is_sustain:
            return "*"
        
        notes_str = "".join(str(note) for note in self.notes)
        if self.lyrics:
            return f"{self.lyrics}:{notes_str}"
        return notes_str

@dataclass
class Section:
    title: str
    beats: List[Beat]
    
    def __str__(self):
        return f"#{self.title}\n" + " ".join(str(beat) for beat in self.beats)

@dataclass
class SURFile:
    metadata: Dict[str, str]
    scale: Dict[str, str]
    composition: List[Section]
    
    def __str__(self):
        sections = [str(section) for section in self.composition]
        return "\n".join(sections) 