from dataclasses import dataclass, field
from enum import Enum, auto
from typing import List, Optional


class NotePitch(Enum):
    """Possible note pitches including silence and sustain"""

    S = "S"
    R = "R"
    G = "G"
    M = "M"
    P = "P"
    D = "D"
    N = "N"
    SILENCE = "-"
    SUSTAIN = "*"


class NoteVariant(Enum):
    """Note variants (shudha, komal, etc)"""

    SHUDHA = auto()
    KOMAL = auto()
    TIVRA = auto()


class ElementType(Enum):
    """Type of element - normal, separator, or bracket"""

    NORMAL = auto()
    SEPARATOR = auto()
    OPEN_BRACKET = auto()
    CLOSE_BRACKET = auto()


@dataclass
class Note:
    """A musical note with pitch, octave, and variant"""

    pitch: NotePitch
    octave: Optional[int] = 0  # 0 is middle, -1 is lower, 1 is higher
    variant: Optional[NoteVariant] = None

    def __str__(self) -> str:
        """String representation of the note"""
        if self.pitch in (NotePitch.SILENCE, NotePitch.SUSTAIN):
            return self.pitch.value

        # Start with the basic pitch
        result = self.pitch.value

        # Add octave marker if not middle octave
        if self.octave > 0:
            result += "'" * self.octave
        elif self.octave < 0:
            result += "," * abs(self.octave)

        return result


@dataclass
class Element:
    """A discrete sub-beat that can contain either lyrics or a single note, but not both"""

    lyrics: Optional[str] = None
    note: Optional[Note] = None
    type: ElementType = ElementType.NORMAL

    def format_lyrics(self, force_quotes: bool = False) -> Optional[str]:
        """Format lyrics, optionally forcing quotes"""
        if not self.lyrics:
            return None
        if force_quotes or " " in self.lyrics:
            return f'"{self.lyrics}"'
        return self.lyrics

    def __str__(self) -> str:
        """String representation of the element"""
        if self.lyrics and self.note:
            return f"{self.format_lyrics(True)}:{str(self.note)}"
        if self.lyrics:
            return self.format_lyrics() or ""
        if self.note:
            return str(self.note)
        return ""


@dataclass
class Beat:
    """A beat in a composition, containing one or more elements"""

    elements: List[Element] = field(default_factory=list)
    bracketed: bool = False  # Track if this beat was originally in brackets

    def __str__(self) -> str:
        """Format the beat for display"""
        if not self.elements:
            return ""

        # If there's only one element, just return its string representation
        if len(self.elements) == 1:
            return str(self.elements[0])

        # Format the elements - use spaces only if bracketed
        formatted = (" ".join if self.bracketed else "".join)(
            str(e) for e in self.elements if str(e)
        )

        # Add brackets only if this was originally bracketed
        return f"[{formatted}]" if self.bracketed else formatted


@dataclass
class Section:
    """A section in a composition, containing one or more beats"""

    title: str
    beats: List[Beat] = field(default_factory=list)

    def __str__(self) -> str:
        """String representation of the section"""
        return f"#{self.title}\n" + " ".join(str(beat) for beat in self.beats)


@dataclass
class SURFile:
    """A SUR file, containing metadata, scale, and composition"""

    metadata: dict[str, str] = field(default_factory=dict)
    scale: dict[str, str] = field(default_factory=dict)
    composition: List[Section] = field(default_factory=list)

    def __str__(self) -> str:
        """String representation of the SUR file"""
        sections = [str(section) for section in self.composition]
        return "\n".join(sections)
