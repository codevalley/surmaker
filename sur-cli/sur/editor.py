from pathlib import Path
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from rich.console import Console
from rich.syntax import Syntax
from .models import SURFile, Section, Beat, Note
from .parser import SURParser

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
            'insert', 'delete', 'section', 'show'
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
        # Add more commands here
    
    def show_current_position(self):
        """Display the current position in the composition"""
        if not self.current_file:
            self.console.print("[red]No file loaded[/red]")
            return
        
        section = self.current_file.composition[self.current_section_index]
        self.console.print(f"\n[bold blue]#{section.title}[/bold blue]")
        
        if section.beats:
            beat_display = " ".join(str(beat) for beat in section.beats)
            syntax = Syntax(beat_display, "sur", theme="monokai")
            self.console.print(syntax)
            
            # Show cursor position
            position = "^".rjust(self.current_beat_index * 2 + 1)
            self.console.print(position, style="bold green")
    
    def _prompt_metadata(self) -> dict:
        """Prompt for composition metadata"""
        metadata = {}
        metadata["name"] = self.session.prompt("Composition name: ")
        metadata["raag"] = self.session.prompt("Raag: ")
        metadata["taal"] = self.session.prompt("Taal: ")
        metadata["tempo"] = self.session.prompt("Tempo: ")
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
        """
        self.console.print(help_text)
    
    def _save_file(self):
        """Save the current file"""
        # TODO: Implement file saving
        self.console.print("[yellow]Save not implemented yet[/yellow]") 