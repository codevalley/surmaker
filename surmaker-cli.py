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
    def __init__(self, name: str, raag: str, taal: str, tempo: str = "madhya", beats_per_row: Optional[int] = None, use_case: bool = False):
        self.config = {
            "name": name,
            "raag": raag.lower(),
            "taal": taal.lower(),
            "beats_per_row": beats_per_row or TaalInfo.get_max_beats(taal),
            "tempo": tempo.lower()
        }
        self.scale = {
            "S": "Sa", "r": "Komal Re", "R": "Shuddha Re",
            "g": "Komal Ga", "G": "Shuddha Ga", "m": "Shuddha Ma",
            "M": "Teevra Ma", "P": "Pa", "d": "Komal Dha",
            "D": "Shuddha Dha", "n": "Komal Ni", "N": "Shuddha Ni"
        }
        self.builder = CompositionBuilder(taal)
        self.use_case = use_case
    
    @classmethod
    def from_file(cls, filepath: Path) -> 'SURFileGenerator':
        """Create a SURFileGenerator instance from an existing .sur file"""
        content = filepath.read_text()
        
        # Extract metadata
        name = re.search(r'name: "(.*?)"', content).group(1)
        raag = re.search(r'raag: "(.*?)"', content).group(1)
        taal = re.search(r'taal: "(.*?)"', content).group(1)
        tempo = re.search(r'tempo: "(.*?)"', content).group(1)
        beats_per_row = int(re.search(r'beats_per_row: "(\d+)"', content).group(1))
        
        # Create instance
        instance = cls(name, raag, taal, tempo, beats_per_row)
        
        # Extract composition
        composition_match = re.search(r'%% COMPOSITION\n(.*)', content, re.DOTALL)
        if composition_match:
            instance.config['composition'] = composition_match.group(1).strip()
        
        return instance
    
    def is_valid_note(self, text: str) -> bool:
        """Check if the given text is a valid note or compound note"""
        # In case-sensitive mode, only uppercase letters are considered notes
        if self.use_case:
            return bool(re.match(r'^[SRGMPDN]+$', text))
        # In normal mode, any case of SRGMPDN is considered a note
        return bool(re.match(r'^[SRGMPDNsrgmpdn]+$', text))

    def standardize_beat(self, beat: str) -> tuple[Optional[str], Optional[str]]:
        """Standardize a single beat entry into (lyrics, notes) tuple"""
        # Handle empty beat
        if not beat or beat == '-':
            return None, None

        # If already properly formatted with quotes, extract lyrics and notes
        lyrics_match = re.search(r'"([^"]*)"', beat)
        if lyrics_match:
            lyrics = lyrics_match.group(1).lower()  # Always lowercase quoted lyrics
            remaining = re.sub(r'"[^"]*"', '', beat).strip()
            if remaining:
                if self.use_case:
                    # In case-sensitive mode, only uppercase is treated as notes
                    return lyrics, remaining if self.is_valid_note(remaining) else remaining.lower()
                else:
                    return lyrics, remaining.upper()
            return lyrics, None

        # Handle curly brace notation - convert to compound notes
        if '{' in beat and '}' in beat:
            notes = beat.strip('{}').replace(',', '')
            if self.use_case:
                # In case-sensitive mode, only uppercase is treated as notes
                return None, notes if self.is_valid_note(notes) else notes.lower()
            return None, notes.upper()

        # If it's a valid note, return as notes
        if self.is_valid_note(beat):
            if self.use_case:
                # In case-sensitive mode, only uppercase is treated as notes
                return None, beat if beat.isupper() else beat.lower()
            return None, beat.upper()

        # If we get here, it's lyrics
        return beat.lower(), None

    def doctor_composition(self) -> None:
        """Clean and standardize the composition"""
        # Get all lines
        lines = []
        current_section = None
        current_beats = []
        
        for line in self.builder.get_formatted_composition():
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('#'):
                # Handle section header
                if current_beats:
                    lines.append((current_section, current_beats))
                    current_beats = []
                current_section = line
            elif line.startswith('b:'):
                # Handle beat line
                beats = line[2:].strip().split()
                processed_beats = []
                
                for beat in beats:
                    if beat == '-':
                        processed_beats.append('-')
                        continue
                        
                    lyrics, notes = self.standardize_beat(beat)
                    if lyrics and notes:
                        processed_beats.append(f'"{lyrics}":{notes}')
                    elif lyrics:
                        processed_beats.append(f'"{lyrics}"')
                    elif notes:
                        processed_beats.append(notes)
                    else:
                        processed_beats.append('-')
                
                current_beats.append(processed_beats)
        
        # Add the last section
        if current_beats:
            lines.append((current_section, current_beats))
        
        # Update the composition with cleaned version
        cleaned_lines = []
        for section, beats in lines:
            if section:
                cleaned_lines.append(f"\n{section}")
            for beat_line in beats:
                cleaned_lines.append(f"b: {' '.join(beat_line)}")
        
        self.builder.composition_lines = []
        self.builder.current_line = []
        self.builder.current_beat = 1
        self.builder.section_headers = []
        
        for line in cleaned_lines:
            if line.startswith('#'):
                self.builder.add_section_header(line)
            elif line.startswith('b:'):
                beats = line[2:].strip().split()
                processed_beats = []
                
                for beat in beats:
                    if beat == '-':
                        processed_beats.append([self.builder.current_beat, '-', '-'])
                        self.builder.current_beat += 1
                    else:
                        if ':' in beat:
                            lyrics, notes = beat.split(':')
                            processed_beats.append([self.builder.current_beat, lyrics, notes])
                        else:
                            processed_beats.append([self.builder.current_beat, '-', beat])
                        self.builder.current_beat += 1
                
                self.builder.add_line(processed_beats)

    def generate_sur_file(self) -> str:
        """Generate the .sur file content"""
        output = []
        
        # Add metadata
        output.append("%% CONFIG")
        output.append(f'name: "{self.config["name"]}"')
        output.append(f'raag: "{self.config["raag"]}"')
        output.append(f'taal: "{self.config["taal"]}"')
        output.append(f'beats_per_row: "{self.config["beats_per_row"]}"')
        output.append(f'tempo: "{self.config["tempo"]}"')
        output.append("")
        
        # Add scale
        output.append("%% SCALE")
        for note, name in self.scale.items():
            output.append(f"{note} -> {name}")
        output.append("")
        
        # Add composition
        output.append("%% COMPOSITION")
        if 'composition' in self.config and self.config['composition']:
            output.append(self.config['composition'])
        
        return '\n'.join(output)

@click.command()
@click.option('--input-file', help='Input .sur file to continue editing', type=click.Path(exists=True))
@click.option('--name', '-n', help='Name of the composition')
@click.option('--raag', '-r', help='Raag of the composition')
@click.option('--taal', '-t', help='Taal of the composition')
@click.option('--tempo', help='Tempo of the composition (vilambit/madhya/drut)')
@click.option('--beats-per-row', type=int, help='Number of beats per row')
@click.option('--output', '-o', help='Output file path')
@click.option('--doctor', is_flag=True, help='Fix formatting of an existing .sur file')
@click.option('--use-case', is_flag=True, help='Honor case sensitivity for lyrics/notes identification')
def main(input_file, name, raag, taal, tempo, beats_per_row, output, doctor, use_case):
    """Interactive tool to create a .sur file"""
    try:
        if input_file:
            generator = SURFileGenerator.from_file(Path(input_file))
            generator.use_case = use_case  # Set use_case flag for existing files
            
            # Use the loaded file's name as output if not specified
            if output is None:
                output = input_file
            
            if doctor:
                generator.doctor_composition()
                with open(output, 'w') as f:
                    f.write(generator.generate_sur_file())
                click.echo(f"\nComposition cleaned and saved to {output}")
                return
        else:
            if not all([name, raag, taal]):
                print("Please provide name, raag, and taal for new composition")
                return
            generator = SURFileGenerator(name, raag, taal, tempo or "madhya", beats_per_row, use_case)

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

if __name__ == '__main__':
    main()