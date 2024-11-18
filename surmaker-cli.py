#!/usr/bin/env python3

import click
import re
from typing import List, Dict, Optional
from pathlib import Path
import json

class TaalInfo:
    TAAL_PATTERNS = {
        'teental': {'beats': 16, 'pattern': '4+4+4+4'},
        'jhaptaal': {'beats': 10, 'pattern': '2+3+2+3'},
        'ektaal': {'beats': 12, 'pattern': '2+2+2+2+2+2'},
        'rupak': {'beats': 7, 'pattern': '3+2+2'},
        'keherwa': {'beats': 8, 'pattern': '4+4'}
    }
    
    @classmethod
    def get_max_beats(cls, taal: str) -> int:
        return cls.TAAL_PATTERNS.get(taal.lower(), {'beats': 16})['beats']
    
    @classmethod
    def get_pattern(cls, taal: str) -> str:
        return cls.TAAL_PATTERNS.get(taal.lower(), {'pattern': '4+4+4+4'})['pattern']

class CompositionBuilder:
    def __init__(self, taal: str):
        self.current_beat = 1
        self.max_beats = TaalInfo.get_max_beats(taal)
        self.taal_pattern = TaalInfo.get_pattern(taal)
        self.composition_lines = []
        self.current_line = []
        self.section_headers = []  # Store section headers
    
    def add_empty_beats(self, target_beat: int):
        while self.current_beat < target_beat:
            self.current_line.append([self.current_beat, "-", "-"])
            self.current_beat += 1
    
    def add_beat(self, lyrics: Optional[str], notes: Optional[str]):
        if self.current_beat > self.max_beats:
            self.finalize_line()
        
        # Ensure empty strings become "-"
        lyrics = "-" if lyrics in [None, "", "-"] else lyrics
        notes = "-" if notes in [None, "", "-"] else notes
        
        self.current_line.append([self.current_beat, lyrics, notes])
        self.current_beat += 1
        
        # Auto-wrap at max beats
        if self.current_beat > self.max_beats:
            self.finalize_line()
            self.current_beat = 1

    def add_line(self, beats: List[List]):
        """Add a complete line of beats"""
        if beats:
            self.composition_lines.append(beats)
    
    def add_section_header(self, header: str):
        """Add a section header"""
        self.section_headers.append((len(self.composition_lines), header))
    
    def finalize_line(self):
        if self.current_line:
            self.composition_lines.append(self.current_line)
            self.current_line = []
            self.current_beat = 1
    
    def get_total_beats(self) -> int:
        """Calculate total number of beats in the composition"""
        total = sum(len(line) for line in self.composition_lines)
        total += len(self.current_line)
        return total
    
    def get_formatted_composition(self) -> List[str]:
        self.finalize_line()  # Ensure last line is added
        formatted_lines = []
        header_idx = 0
        
        # Add lines with headers at correct positions
        for i, line in enumerate(self.composition_lines):
            # Add any headers that belong before this line
            while header_idx < len(self.section_headers) and self.section_headers[header_idx][0] == i:
                if formatted_lines and not formatted_lines[-1].startswith('#'):
                    formatted_lines.append("")  # Add blank line before header if needed
                formatted_lines.append(self.section_headers[header_idx][1])
                header_idx += 1
            
            # Format and add the line
            formatted_beats = []
            for _, lyric, note in line:
                if lyric != "-" and note != "-":
                    formatted_beats.append(f"[{lyric}:{note}]")
                else:
                    if note != "-":
                        formatted_beats.append(f"[{note}]")
                    if lyric != "-":
                        formatted_beats.append(f"[{lyric}]")
                    if lyric == "-" and note == "-":
                        formatted_beats.append("[-]")
            
            formatted_lines.append(f"b: {''.join(formatted_beats)}")
        
        # Add any remaining headers
        while header_idx < len(self.section_headers) and self.section_headers[header_idx][0] == len(self.composition_lines):
            if formatted_lines and not formatted_lines[-1].startswith('#'):
                formatted_lines.append("")  # Add blank line before header if needed
            formatted_lines.append(self.section_headers[header_idx][1])
            header_idx += 1
        
        return formatted_lines

    def display_current_row(self) -> str:
        """Returns a visual representation of the current row with beat numbers and entered notes"""
        # Create beat number display
        beats = ["   " for _ in range(self.max_beats)]
        beats[self.current_beat - 1] = "^^"
        beat_numbers = [f"{i+1:2}" for i in range(self.max_beats)]
        
        # Create current line display
        current_line_display = [" - " for _ in range(self.max_beats)]
        for i, (_, lyric, note) in enumerate(self.current_line):
            display = ""
            if lyric != "-" and note != "-":
                display = f"{lyric[:2]}:{note}"
            elif lyric != "-":
                display = f"{lyric[:3]}"
            elif note != "-":
                display = f" {note} "
            current_line_display[i] = f"{display:3}"

        return (f"Position: {self.current_beat}/{self.max_beats}\n"
                f"Beats:  {' '.join(beat_numbers)}\n"
                f"       {' '.join(beats)}\n"
                f"Notes:  {' '.join(current_line_display)}")

class SURFileGenerator:
    def __init__(self, name: str, raag: str, taal: str, tempo: str = "madhya"):
        self.config = {
            "name": name,
            "raag": raag.lower(),
            "taal": taal.lower(),
            "beats_per_row": TaalInfo.get_max_beats(taal),
            "tempo": tempo.lower()
        }
        self.scale = {
            "S": "Sa", "r": "Komal Re", "R": "Shuddha Re",
            "g": "Komal Ga", "G": "Shuddha Ga", "m": "Shuddha Ma",
            "M": "Teevra Ma", "P": "Pa", "d": "Komal Dha",
            "D": "Shuddha Dha", "n": "Komal Ni", "N": "Shuddha Ni"
        }
        self.builder = CompositionBuilder(taal)
    
    @classmethod
    def from_file(cls, filepath: Path) -> 'SURFileGenerator':
        """Create a SURFileGenerator instance from an existing .sur file"""
        content = filepath.read_text()
        
        # Parse existing file
        config = {}
        composition_lines = []
        in_config = False
        in_composition = False
        current_line = []
        section_headers = []
        line_count = 0
        
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('%% CONFIG'):
                in_config = True
                in_composition = False
                continue
            elif line.startswith('%% COMPOSITION'):
                in_config = False
                in_composition = True
                continue
            elif line.startswith('%% SCALE'):
                in_config = False
                in_composition = False
                continue
                
            if in_config and ':' in line:
                key, value = line.split(':', 1)
                config[key.strip()] = value.strip().strip('"')
            elif in_composition or (line.startswith('b:') or line.startswith('l:') or line.startswith('#')):
                if line.startswith('#'):
                    section_headers.append((line_count, line))
                elif line.startswith('b:') or line.startswith('l:'):
                    composition_lines.append(line)
                    line_count += 1
        
        # Create instance with parsed config
        instance = cls(
            name=config.get('name', 'Untitled'),
            raag=config.get('raag', 'unknown'),
            taal=config.get('taal', 'teental'),
            tempo=config.get('tempo', 'madhya')
        )
        
        # Parse and load existing composition
        current_line = []
        beat_count = 1
        
        for line in composition_lines:
            if ':' in line:
                # Parse the line content after the type indicator
                line_content = line.split(':', 1)[1].strip()
                # Extract beats from the line
                beats = re.findall(r'\[(.*?)\]', line_content)
                
                for beat in beats:
                    if beat == '-':
                        current_line.append([beat_count, "-", "-"])
                    elif ':' in beat:
                        lyric, note = beat.split(':')
                        current_line.append([beat_count, lyric, note])
                    else:
                        current_line.append([beat_count, "-", beat])
                    
                    beat_count += 1
                    
                    # When we reach max beats, add the line and reset
                    if beat_count > instance.builder.max_beats:
                        instance.builder.add_line(current_line)
                        current_line = []
                        beat_count = 1
        
        # Handle the last line
        if current_line:
            # If it's a complete line, add it and start fresh
            if len(current_line) == instance.builder.max_beats:
                instance.builder.add_line(current_line)
                instance.builder.current_line = []
                instance.builder.current_beat = 1
            else:
                # If it's incomplete, set it as the current line and continue from there
                instance.builder.current_line = current_line
                instance.builder.current_beat = len(current_line) + 1
        
        # Add the section headers
        for line_num, header in section_headers:
            instance.builder.section_headers.append((line_num, header))
        
        return instance
    
    def parse_input(self, user_input: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
        """Parse user input for lyrics, notes, and beat jumps"""
        if not user_input or user_input.strip() == '-':
            return "-", "-", None
            
        # Check for section header
        if user_input.startswith('#'):
            self.builder.finalize_line()  # Finish current line if any
            self.builder.add_section_header(user_input)
            return None, None, None  # Special case for section header
            
        # Check for beat jump
        beat_jump = None
        beat_match = re.search(r'\((\d+)\)', user_input)
        if beat_match:
            beat_jump = int(beat_match.group(1))
            user_input = re.sub(r'\(\d+\)', '', user_input)
        
        # Check for lyrics (in quotes)
        lyrics = None
        lyrics_match = re.search(r'"([^"]*)"', user_input)
        if lyrics_match:
            lyrics = lyrics_match.group(1)
            user_input = re.sub(r'"[^"]*"', '', user_input)
        
        # Handle multiple beats input (space-separated)
        notes = user_input.strip()
        if notes == '':
            notes = "-"
        elif ' ' in notes:
            # Split by space and handle each note/group
            note_groups = []
            for note in notes.split():
                if note.startswith('{') and note.endswith('}'):
                    # Remove braces and keep multi-note as is
                    note_groups.append(note[1:-1])
                else:
                    note_groups.append(note)
            return lyrics, note_groups, beat_jump
            
        # Handle single multi-note in curly braces
        if notes and notes.startswith('{') and notes.endswith('}'):
            notes = notes[1:-1]  # Remove braces
        
        return lyrics, notes, beat_jump

    def generate_sur_file(self) -> str:
        output = []
        
        # Add CONFIG section
        output.append("%% CONFIG")
        for key, value in self.config.items():
            output.append(f"{key}: \"{value}\"")
        output.append("")
        
        # Add SCALE section
        output.append("%% SCALE")
        for note, name in self.scale.items():
            output.append(f"{note} -> {name}")
        output.append("")
        
        # Add COMPOSITION section with headers
        output.append("%% COMPOSITION")
        current_section = None
        for line in self.builder.get_formatted_composition():
            if line.startswith('#'):
                output.append("")  # Add blank line before section
                output.append(line)
                current_section = line
            else:
                output.append(line)
        
        return "\n".join(output)

def print_help():
    click.echo("\nInput format help:")
    click.echo('1. Notes: Just type the note (S R G M P D N)')
    click.echo('2. Lyrics: Use quotes ("mo" "re")')
    click.echo('3. Both: Combine lyrics and notes ("mo" S)')
    click.echo('4. Jump to beat: Use parentheses ((4) S)')
    click.echo('5. Multiple notes in one beat: Use curly braces ({S,R,G})')
    click.echo('6. Multiple beats at once: Space-separated notes (S R G M P)')
    click.echo('7. Section headers: Start with # (#Sthayi, #Antara)')
    click.echo('8. Empty beat: Just press Enter or type "-"')
    click.echo('9. Special commands:')
    click.echo('   - stop/exit: End composition with option to save')
    click.echo('   - quit: End composition without saving')
    click.echo('   - help: Show this help')
    click.echo('   - undo: Remove last entry')
    click.echo('   - show: Show full composition so far\n')

@click.command()
@click.option('--input-file', help='Input .sur file to continue editing', type=click.Path(exists=True, path_type=Path))
@click.option('--name', help='Name of the composition', required=False)
@click.option('--raag', help='Name of the raag', required=False)
@click.option('--taal', help='Taal of the composition', required=False)
@click.option('--tempo', help='Tempo (vilambit/madhya/drut)', default='madhya', required=False)
@click.option('--output', help='Output filename', default='composition.sur')
def main(input_file, name, raag, taal, tempo, output):
    """Interactive tool to create a .sur file"""
    try:
        if input_file:
            generator = SURFileGenerator.from_file(input_file)
            # Use the loaded file's name as output if not specified
            if output == 'composition.sur':
                output = input_file.name
        else:
            # Only prompt for required fields if no input file
            if not name:
                name = click.prompt('Composition name')
            if not raag:
                raag = click.prompt('Raag')
            if not taal:
                taal = click.prompt('Taal')
            generator = SURFileGenerator(name, raag, taal, tempo)
        
        print_help()
        
        while True:
            # Show current position with beat numbers and entered notes
            click.echo(f"\n{generator.builder.display_current_row()}")
            click.echo(f"\nTotal beats recorded: {generator.builder.get_total_beats()}")
            
            user_input = click.prompt("Enter notes/lyrics (or 'help' for format)").strip()
            
            if user_input.lower() in ['stop', 'exit']:
                if click.confirm('\nDo you want to save before exiting?', default=True):
                    with open(output, 'w') as f:
                        f.write(generator.generate_sur_file())
                    click.echo(f"\nComposition saved to {output}")
                else:
                    click.echo("\nExiting without saving...")
                break
            elif user_input.lower() == 'quit':
                if generator.builder.get_total_beats() > 0:
                    if click.confirm('\nYou have unsaved changes. Are you sure you want to quit without saving?', default=False):
                        click.echo("\nExiting without saving...")
                        break
                    continue
                else:
                    break
            elif user_input.lower() == 'help':
                print_help()
                continue
            elif user_input.lower() == 'undo':
                if generator.builder.current_line:
                    generator.builder.current_line.pop()
                    generator.builder.current_beat -= 1
                    click.echo("Last entry removed")
                continue
            elif user_input.lower() == 'show':
                click.echo("\nComposition so far:")
                sur_content = generator.generate_sur_file()
                click.echo(sur_content)
                continue
            
            # Parse and add the input
            lyrics, notes, beat_jump = generator.parse_input(user_input)
            
            # Handle section header
            if lyrics is None and notes is None:
                generator.builder.get_formatted_composition().append(user_input)
                continue
                
            if beat_jump:
                generator.builder.add_empty_beats(beat_jump)
                
            # Handle multiple beats
            if isinstance(notes, list):
                for note in notes:
                    generator.builder.add_beat(lyrics, note)
            else:
                generator.builder.add_beat(lyrics, notes)
            
    except (KeyboardInterrupt, click.Abort):
        click.echo("\nComposition aborted!")
        return

if __name__ == '__main__':
    main()