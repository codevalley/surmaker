from typing import Optional, List
from rich.console import Console
from rich.prompt import Prompt
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from .models import SURFile, Section, Beat, Element, Note, NotePitch
from .parser import SURParser

class SUREditor:
    def __init__(self):
        self.console = Console()
        self.parser = SURParser()
        self.current_file: Optional[SURFile] = None
        self.current_section_index: int = 0
        self.current_beat_index: int = 0
        
        # Setup command completion
        self.commands = {
            "show": "Display current position",
            "append": "Add a beat after current position",
            "insert": "Insert a beat at current position",
            "delete": "Delete current beat",
            "debug": "Show debug info for a beat",
            "quit": "Exit editor",
            "help": "Show this help"
        }
        self.completer = WordCompleter(list(self.commands.keys()), ignore_case=True)
        self.session = PromptSession(completer=self.completer)
        
    def load_file(self, content: str):
        """Load a SUR file from string content"""
        self.current_file = self.parser.parse(content)
        self.current_section_index = 0
        self.current_beat_index = 0
        
    def show_current_position(self):
        """Display the current position in the composition"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
        
        section = self.current_file.composition[self.current_section_index]
        beats_per_rhythm = int(self.current_file.metadata.get("beats_per_rhythm", 16))
        
        # Calculate progress information
        total_beats = len(section.beats)
        total_rhythms = total_beats / beats_per_rhythm if beats_per_rhythm else 0
        
        # Show section header with progress
        self.console.print(
            f"\n[bold blue]#{section.title}[/bold blue] "
            f"([yellow]{total_beats}[/yellow] beats, "
            f"[yellow]{total_rhythms:.2f}[/yellow] rhythms)"
        )
        
        if section.beats:
            # Group beats into rhythms for display
            rhythms = []
            current_rhythm = []
            cursor_row = self.current_beat_index // beats_per_rhythm
            cursor_col = self.current_beat_index % beats_per_rhythm
            
            for i, beat in enumerate(section.beats):
                current_rhythm.append(str(beat) or "_")
                if (i + 1) % beats_per_rhythm == 0:
                    rhythms.append(current_rhythm)
                    current_rhythm = []
            
            # Add remaining beats if any
            if current_rhythm:
                rhythms.append(current_rhythm)
            
            # Display each rhythm line with cursor
            for i, rhythm in enumerate(rhythms):
                rhythm_str = " ".join(rhythm)
                self.console.print(f"b: {rhythm_str}")
                
                if i == cursor_row:
                    # Calculate cursor position
                    cursor = "b: "
                    for j in range(cursor_col):
                        cursor += " " * (len(rhythm[j]) + 1)
                    cursor += "[bold red]▲[/bold red]"
                    self.console.print(cursor)
    
    def debug_beat(self, beat_number: Optional[int] = None):
        """Debug a specific beat or the current beat"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
            
        section = self.current_file.composition[self.current_section_index]
        if not section.beats:
            self.console.print("[yellow]No beats in current section[/yellow]")
            return
            
        beat_idx = beat_number - 1 if beat_number else self.current_beat_index
        if beat_idx < 0 or beat_idx >= len(section.beats):
            self.console.print(f"[red]Beat {beat_idx + 1} does not exist[/red]")
            return
            
        beat = section.beats[beat_idx]
        self.console.print(f"\nDetailed Beat {beat_idx + 1} Information:")
        self.console.print(f"Raw beat type: {type(beat)}")
        self.console.print(f"Number of elements: {len(beat.elements)}")
        self.console.print(f"Formatted output: {repr(str(beat))}")
        
        for i, element in enumerate(beat.elements, 1):
            self.console.print(f"\nElement {i}:")
            self.console.print(f"  Has lyrics: {element.lyrics is not None}")
            if element.lyrics:
                self.console.print(f"  Lyrics: {repr(element.lyrics)}")
            self.console.print(f"  Has note: {element.note is not None}")
            if element.note:
                self.console.print(f"  Note:")
                self.console.print(f"    Pitch: {element.note.pitch.name}")
                if element.note.pitch not in (NotePitch.SILENCE, NotePitch.SUSTAIN):
                    self.console.print(f"    Octave: {element.note.octave}")
            self.console.print(f"  Formatted: {repr(str(element))}")
    
    def _parse_note_input(self, note_str: str) -> Optional[Note]:
        """Parse note input from user"""
        if not note_str:
            return None
        
        # Handle special notes
        if note_str == "-":
            return Note(pitch=NotePitch.SILENCE)
        if note_str == "*":
            return Note(pitch=NotePitch.SUSTAIN)
        
        # Parse octave
        octave = 0
        while note_str.endswith("'"):
            octave += 1
            note_str = note_str[:-1]
        while note_str.endswith(","):
            octave -= 1
            note_str = note_str[:-1]
        
        # Parse pitch
        try:
            pitch = NotePitch(note_str)
            return Note(pitch=pitch, octave=octave)
        except ValueError:
            self.console.print(f"[red]Invalid note: {note_str}[/red]")
            return None
    
    def append(self, input_str: str):
        """Append new beats to the current section"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
            
        section = self.current_file.composition[self.current_section_index]
        
        # Parse the input into beats
        beats = self.parser.parse_line(input_str)
        if beats:
            section.beats.extend(beats)
            self.current_beat_index = len(section.beats) - 1
            self.show_current_position()
        else:
            self.console.print("[red]Invalid beat format[/red]")
    
    def insert(self, input_str: str):
        """Insert new beats at the current position"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
            
        section = self.current_file.composition[self.current_section_index]
        
        # Parse the input into beats
        beats = self.parser.parse_line(input_str)
        if beats:
            section.beats[self.current_beat_index:self.current_beat_index] = beats
            self.current_beat_index += len(beats)
            self.show_current_position()
        else:
            self.console.print("[red]Invalid beat format[/red]")
    
    def delete(self):
        """Delete the current beat"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
            
        section = self.current_file.composition[self.current_section_index]
        if not section.beats:
            self.console.print("[yellow]No beats to delete[/yellow]")
            return
            
        section.beats.pop(self.current_beat_index)
        if self.current_beat_index >= len(section.beats):
            self.current_beat_index = max(0, len(section.beats) - 1)
        self.show_current_position()

    def new_file(self):
        """Create a new SUR file"""
        # Get metadata
        name = Prompt.ask("Composition name")
        raag = Prompt.ask("Raag")
        taal = Prompt.ask("Taal")
        tempo = Prompt.ask("Tempo")
        beats_per_rhythm = Prompt.ask("Beats per rhythm (e.g. 16 for Teental)", default="16")
        
        metadata = {
            "name": name,
            "raag": raag,
            "taal": taal,
            "tempo": tempo,
            "beats_per_rhythm": beats_per_rhythm
        }
        
        # Get scale
        self.console.print("\nDefine the scale (Enter empty line to finish):")
        scale = {}
        while True:
            line = Prompt.ask("Scale", default="")
            if not line:
                break
            if "->" in line:
                note, name = line.split("->")
                scale[note.strip()] = name.strip()
        
        # Create new file with empty Sthayi section
        self.current_file = SURFile(
            metadata=metadata,
            scale=scale,
            composition=[Section("Sthayi")]
        )
        self.current_section_index = 0
        self.current_beat_index = 0
        self.show_current_position()

    def start(self):
        """Start the editor session"""
        while True:
            try:
                # Use prompt_toolkit for better input handling
                command = self.session.prompt("sur> ").strip()
                if not command:
                    continue
                
                parts = command.split(maxsplit=1)
                cmd = parts[0].lower()
                args = parts[1] if len(parts) > 1 else ""
                
                if cmd == "quit":
                    break
                elif cmd == "show":
                    self.show_current_position()
                elif cmd == "debug":
                    try:
                        beat_num = int(args) if args else None
                        self.debug_beat(beat_num)
                    except ValueError:
                        self.console.print("[red]Invalid beat number[/red]")
                elif cmd == "append":
                    self.append(args)
                elif cmd == "insert":
                    self.insert(args)
                elif cmd == "delete":
                    self.delete()
                elif cmd == "help":
                    self._show_help()
                else:
                    self.console.print(f"[red]Unknown command: {cmd}[/red]")
                    self.console.print("Type 'help' for available commands")
                    
            except KeyboardInterrupt:
                continue
            except EOFError:
                break

    def _show_help(self):
        """Show help information"""
        self.console.print("\n[bold blue]Available Commands:[/bold blue]")
        for cmd, desc in self.commands.items():
            self.console.print(f"[yellow]{cmd:10}[/yellow] {desc}")
        
        help_text = """
        [bold blue]Beat Format:[/bold blue]
        - Notes: S R G M P D N (uppercase only)
        - Octaves: S' (higher), S, (lower)
        - Silence: -
        - Sustain: *
        - Lyrics: [sa:S re:R]
        - Multiple notes: [sa SRG]
        """
        self.console.print(help_text)