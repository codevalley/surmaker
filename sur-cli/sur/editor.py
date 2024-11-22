from pathlib import Path
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from rich.console import Console
from rich.syntax import Syntax
from .models import SURFile, Section, Beat, Note
from .parser import SURParser
from typing import Optional

class Editor:
    def __init__(self):
        self.console = Console()
        self.session = PromptSession()
        self.parser = SURParser()
        self.current_file: SURFile = None
        self.current_section_index = 0
        self.current_beat_index = 0
        self.modified = False
        
        self.commands = WordCompleter([
            'save', 'quit', 'help', 'next', 'prev',
            'insert', 'delete', 'section', 'show',
            'append', 'replace'
        ])
    
    def load_file(self, path: Path):
        """Load a SUR file"""
        content = path.read_text()
        self.current_file = self.parser.parse_file(content)
        self.show_current_position()
    
    def new_file(self):
        """Create a new SUR file"""
        metadata = self._prompt_metadata()
        scale = self._prompt_scale()
        self.current_file = SURFile(
            metadata=metadata,
            scale=scale,
            composition=[Section("Sthayi", [])]
        )
        self.modified = True
    
    def start(self):
        """Start the editor session"""
        while True:
            try:
                command = self.session.prompt(
                    "sur> ",
                    completer=self.commands
                ).strip()
                
                if not command:
                    continue
                
                if command == "quit":
                    if self.modified:
                        if self._confirm_quit():
                            break
                    else:
                        break
                
                self._handle_command(command)
                
            except KeyboardInterrupt:
                continue
            except EOFError:
                break
    
    def _handle_command(self, command: str):
        """Handle editor commands"""
        parts = command.split()
        cmd = parts[0]
        
        if cmd == "show":
            self.show_current_position()
        elif cmd == "next":
            self._move_next()
        elif cmd == "prev":
            self._move_prev()
        elif cmd == "help":
            self._show_help()
        elif cmd == "save":
            self._save_file()
        elif cmd == "append":
            self._append_notes(" ".join(parts[1:]) if len(parts) > 1 else None)
        elif cmd == "replace":
            self._replace_notes(" ".join(parts[1:]) if len(parts) > 1 else None)
        elif cmd == "delete":
            self._delete_current_beat()
        elif cmd == "insert":
            self._insert_notes(" ".join(parts[1:]) if len(parts) > 1 else None)
    
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
            
            # Process beats into display format
            for i, beat in enumerate(section.beats):
                current_rhythm.append(beat)
                
                if (i + 1) % beats_per_rhythm == 0:
                    rhythms.append(current_rhythm)
                    current_rhythm = []
            
            # Add remaining beats if any
            if current_rhythm:
                rhythms.append(current_rhythm)
            
            # Display each rhythm line with cursor
            for i, rhythm in enumerate(rhythms):
                # Format and join beats with single space
                rhythm_str = " ".join(self._format_beat(b) for b in rhythm)
                self.console.print(f"b: {rhythm_str}")
                
                if i == cursor_row:
                    # Calculate cursor position
                    cursor = "b: "
                    for j in range(cursor_col):
                        if j < len(rhythm):
                            cursor += " " * (len(self._format_beat(rhythm[j])) + 1)
                    cursor += "[bold red]▲[/bold red]"
                    self.console.print(cursor)
            
            # Show current position info
            current_rhythm = self.current_beat_index // beats_per_rhythm
            position_in_rhythm = self.current_beat_index % beats_per_rhythm
            self.console.print(
                f"\nPosition: [cyan]rhythm {current_rhythm + 1}[/cyan], "
                f"[cyan]beat {position_in_rhythm + 1}/{beats_per_rhythm}[/cyan]"
            )
    
    def _prompt_metadata(self) -> dict:
        """Prompt for composition metadata"""
        metadata = {}
        metadata["name"] = self.session.prompt("Composition name: ")
        metadata["raag"] = self.session.prompt("Raag: ")
        metadata["taal"] = self.session.prompt("Taal: ")
        metadata["tempo"] = self.session.prompt("Tempo: ")
        metadata["beats_per_rhythm"] = self.session.prompt(
            "Beats per rhythm (e.g. 16 for Teental): ",
            default="16"
        )
        return metadata
    
    def _prompt_scale(self) -> dict:
        """Prompt for scale definition"""
        self.console.print("\nDefine the scale (Enter empty line to finish):")
        scale = {}
        while True:
            line = self.session.prompt("Scale> ")
            if not line:
                break
            if "->" in line:
                note, name = line.split("->")
                scale[note.strip()] = name.strip()
        return scale
    
    def _confirm_quit(self) -> bool:
        """Confirm before quitting with unsaved changes"""
        response = self.session.prompt(
            "You have unsaved changes. Quit anyway? (y/N) "
        ).lower()
        return response == 'y'
    
    def _move_next(self):
        """Move to next beat"""
        section = self.current_file.composition[self.current_section_index]
        if self.current_beat_index < len(section.beats) - 1:
            self.current_beat_index += 1
        elif self.current_section_index < len(self.current_file.composition) - 1:
            self.current_section_index += 1
            self.current_beat_index = 0
        self.show_current_position()
    
    def _move_prev(self):
        """Move to previous beat"""
        if self.current_beat_index > 0:
            self.current_beat_index -= 1
        elif self.current_section_index > 0:
            self.current_section_index -= 1
            section = self.current_file.composition[self.current_section_index]
            self.current_beat_index = len(section.beats) - 1
        self.show_current_position()
    
    def _show_help(self):
        """Show help information"""
        help_text = """
        Commands:
        - show: Display current position
        - next: Move to next beat
        - prev: Move to previous beat
        - save: Save current file
        - quit: Exit editor
        - help: Show this help
        
        Editing Commands:
        - append <notes>: Add notes after current position
        - insert <notes>: Insert notes at current position
        - replace <notes>: Replace current beat with new notes
        - delete: Delete current beat
        
        Note Format:
        - Single notes: S R G M P D N
        - Lower octave: .S .R .G .M .P .D .N
        - Upper octave: S' R' G' M' P' D' N'
        - Lyrics: "sa":S "re":R
        - Silence: -
        - Sustain: *
        """
        self.console.print(help_text)
    
    def _save_file(self):
        """Save the current file"""
        # TODO: Implement file saving
        self.console.print("[yellow]Save not implemented yet[/yellow]") 
    
    def _append_notes(self, notes_str: Optional[str] = None):
        """Append notes after current position"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return

        if not notes_str:
            notes_str = self.session.prompt("Enter notes to append: ")

        if not notes_str:
            return

        section = self.current_file.composition[self.current_section_index]
        beats = self.parser._parse_beats(notes_str)
        
        if not beats:
            return
        
        # Insert after current position
        insert_pos = self.current_beat_index + 1
        section.beats[insert_pos:insert_pos] = beats
        self.modified = True
        
        # Move cursor to after the last inserted beat
        self.current_beat_index = insert_pos + len(beats) - 1
        self.show_current_position()

    def _replace_notes(self, notes_str: Optional[str] = None):
        """Replace notes at current position"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return

        if not notes_str:
            notes_str = self.session.prompt("Enter notes to replace with: ")

        if not notes_str:
            return

        section = self.current_file.composition[self.current_section_index]
        beats = self.parser._parse_beats(notes_str)
        
        if beats:
            section.beats[self.current_beat_index:self.current_beat_index+1] = beats
            self.modified = True
            self.show_current_position()

    def _delete_current_beat(self):
        """Delete beat at current position"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return

        section = self.current_file.composition[self.current_section_index]
        if 0 <= self.current_beat_index < len(section.beats):
            del section.beats[self.current_beat_index]
            self.modified = True
            if self.current_beat_index >= len(section.beats):
                self.current_beat_index = max(0, len(section.beats) - 1)
            self.show_current_position()

    def _insert_notes(self, notes_str: Optional[str] = None):
        """Insert notes at current position"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return

        if not notes_str:
            notes_str = self.session.prompt("Enter notes to insert: ")

        if not notes_str:
            return

        section = self.current_file.composition[self.current_section_index]
        beats = self.parser._parse_beats(notes_str)
        
        if not beats:
            return
        
        # Insert at current position
        section.beats[self.current_beat_index:self.current_beat_index] = beats
        self.modified = True
        
        # Move cursor to after the last inserted beat
        self.current_beat_index += len(beats)
        self.show_current_position()
    
    def _format_beat(self, beat: Beat) -> str:
        """Format a beat for display with consistent spacing"""
        if beat.is_silence:
            return "-"
        if beat.is_sustain:
            return "*"
        
        # Handle compound notes and lyrics
        notes_str = "".join(str(note) for note in beat.notes)
        
        # Always use brackets for lyrics
        if beat.lyrics:
            # Handle lyrics with or without quotes
            lyrics = f'"{beat.lyrics}"' if ' ' in beat.lyrics else beat.lyrics
            return f'[{lyrics}:{notes_str}]'
        
        # Use brackets for compound notes (more than one note)
        if len(beat.notes) > 1:
            return f'[{notes_str}]'
        
        # Single note without lyrics
        return notes_str if notes_str else ""
 