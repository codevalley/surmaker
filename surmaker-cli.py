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
    
    def finalize_line(self):
        if self.current_line:
            self.composition_lines.append(self.current_line)
            self.current_line = []
    
    def get_formatted_composition(self) -> List[str]:
        self.finalize_line()  # Ensure last line is added
        formatted_lines = []
        
        # Helper to format beats into rows
        def format_row_beats(beats):
            formatted_beats = []
            for _, lyric, note in beats:
                if lyric != "-" and note != "-":
                    formatted_beats.append(f"[{lyric}:{note}]")
                else:
                    if note != "-":
                        formatted_beats.append(f"[{note}]")
                    if lyric != "-":
                        formatted_beats.append(f"[{lyric}]")
                    if lyric == "-" and note == "-":
                        formatted_beats.append("[-]")
            return ''.join(formatted_beats)
        
        # Process each line
        for line in self.composition_lines:
            notes_line = []
            lyrics_line = []
            has_empty_beats = False
            
            for beat, lyric, note in line:
                if lyric == "-" and note == "-":
                    has_empty_beats = True
                
                if lyric != "-" and note != "-":
                    notes_line.append(f"[{lyric}:{note}]")
                    lyrics_line = None
                else:
                    if note != "-":
                        notes_line.append(f"[{note}]")
                    if lyric != "-" and lyrics_line is not None:
                        lyrics_line.append(f"[{lyric}]")
            
            # Format the line based on content
            if has_empty_beats:
                formatted_lines.append(f"b: {format_row_beats(line)}")
            else:
                if lyrics_line:
                    formatted_lines.append(f"l: {''.join(lyrics_line)}")
                if notes_line:
                    formatted_lines.append(f"b: {''.join(notes_line)}")
                    
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

        return (f"Beats:  {' '.join(beat_numbers)}\n"
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
        in_config = False
        
        for line in content.split('\n'):
            if line.startswith('%% CONFIG'):
                in_config = True
                continue
            elif line.startswith('%%'):
                in_config = False
                continue
                
            if in_config and ':' in line:
                key, value = line.split(':', 1)
                config[key.strip()] = value.strip().strip('"')
        
        # Create instance with parsed config
        instance = cls(
            name=config.get('name', 'Untitled'),
            raag=config.get('raag', 'unknown'),
            taal=config.get('taal', 'teental'),
            tempo=config.get('tempo', 'madhya')
        )
        
        return instance
    
    def parse_input(self, user_input: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
        """Parse user input for lyrics, notes, and beat jumps"""
        if not user_input or user_input.strip() == '-':
            return "-", "-", None
            
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
        
        # Remaining content is notes
        notes = user_input.strip()
        if notes == '':
            notes = "-"
            
        # Handle multiple notes in curly braces
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
        
        # Add COMPOSITION section
        output.append("%% COMPOSITION")
        output.extend(self.builder.get_formatted_composition())
        
        return "\n".join(output)

def print_help():
    click.echo("\nInput format help:")
    click.echo('1. Notes: Just type the note (S R G M P D N)')
    click.echo('2. Lyrics: Use quotes ("mo" "re")')
    click.echo('3. Both: Combine lyrics and notes ("mo" S)')
    click.echo('4. Jump to beat: Use parentheses ((4) S)')
    click.echo('5. Multiple notes: Use curly braces ({S,R,G})')
    click.echo('6. Empty beat: Just press Enter or type "-"')
    click.echo('7. Special commands:')
    click.echo('   - stop: End composition')
    click.echo('   - help: Show this help')
    click.echo('   - undo: Remove last entry')
    click.echo('   - show: Show full composition so far\n')

@click.command()
@click.option('--name', prompt='Composition name', help='Name of the composition')
@click.option('--raag', prompt='Raag', help='Name of the raag')
@click.option('--taal', prompt='Taal', help='Taal of the composition')
@click.option('--tempo', prompt='Tempo', default='madhya', help='Tempo (vilambit/madhya/drut)')
@click.option('--output', prompt='Output filename', default='composition.sur', help='Output .sur file name')
@click.option('--input-file', help='Input .sur file to continue editing', type=click.Path(exists=True, path_type=Path))

def main(name, raag, taal, tempo, output, input_file):
    """Interactive tool to create a .sur file"""
    if input_file:
        generator = SURFileGenerator.from_file(input_file)
    else:
        generator = SURFileGenerator(name, raag, taal, tempo)
    
    print_help()
    
    while True:
        # Show current position with taal pattern
        position = generator.builder.get_display_line()
        total_beats = (len(generator.builder.composition_lines) * generator.builder.max_beats) + len(generator.builder.current_line)
        
        # Display current row with beat numbers and notes
        click.echo(f"\n{generator.builder.display_current_row()}")
        click.echo(f"\n{position}")
        click.echo(f"Total beats recorded: {total_beats}")
        
        user_input = click.prompt("Enter notes/lyrics (or 'help' for format)").strip()
        
        if user_input.lower() == 'stop':
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

if __name__ == '__main__':
    main()