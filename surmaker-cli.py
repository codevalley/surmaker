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
        self.last_note = None  # Track last note for sustain
        self.last_lyric = None  # Track last lyric for sustain
    
    def add_empty_beats(self, target_beat: int):
        while self.current_beat < target_beat:
            self.current_line.append([self.current_beat, "-", "-"])
            self.current_beat += 1
    
    def add_beat(self, lyrics: Optional[str], notes: Optional[str]):
        if self.current_beat > self.max_beats:
            self.finalize_line()
        
        # Handle sustain
        if notes == '*':
            notes = self.last_note
            lyrics = self.last_lyric
        else:
            self.last_note = notes
            self.last_lyric = lyrics
        
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
        """Returns a list of formatted composition lines."""
        self.finalize_line()
        formatted_lines = []
        header_idx = 0
        
        for i, line in enumerate(self.composition_lines):
            # Add headers
            while (header_idx < len(self.section_headers) and 
                   self.section_headers[header_idx][0] == i):
                if formatted_lines and not formatted_lines[-1].startswith('#'):
                    formatted_lines.append("")
                formatted_lines.append(self.section_headers[header_idx][1])
                header_idx += 1
            
            formatted_beats = []
            for _, lyric, note in line:
                if lyric != "-" and note != "-":
                    # Combine notes without spaces if they're simple notes
                    if ' ' not in note and all(len(n) == 1 for n in note.split()):
                        note = note.replace(' ', '')
                    formatted_beats.append(f"[{note} {lyric}]")
                elif lyric != "-":
                    formatted_beats.append(lyric)
                elif note != "-":
                    if '-' in note:
                        # Keep silence notation compact
                        note = note.replace(' - ', '-')
                    if ' ' in note and all(len(n) == 1 for n in note.split()):
                        # Combine simple notes without spaces
                        note = note.replace(' ', '')
                    formatted_beats.append(note)
                else:
                    formatted_beats.append("-")
            
            formatted_lines.append(f"b: {' '.join(formatted_beats)}")
        
        # Add remaining headers
        while (header_idx < len(self.section_headers) and 
               self.section_headers[header_idx][0] == len(self.composition_lines)):
            if formatted_lines and not formatted_lines[-1].startswith('#'):
                formatted_lines.append("")
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
    def __init__(self, name: str, raag: str, taal: str, tempo: str = "madhya", 
                 beats_per_row: Optional[int] = None):
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
    
    @classmethod
    def from_file(cls, filepath: Path) -> 'SURFileGenerator':
        """Create a SURFileGenerator instance from an existing .sur file"""
        content = filepath.read_text()
        
        # Extract metadata
        name = re.search(r'name: "(.*?)"', content)
        raag = re.search(r'raag: "(.*?)"', content)
        taal = re.search(r'taal: "(.*?)"', content)
        tempo = re.search(r'tempo: "(.*?)"', content)
        beats_per_row = re.search(r'beats_per_row: "(\d+)"', content)
        
        if not all([name, raag, taal, tempo, beats_per_row]):
            raise ValueError("Missing required metadata in file")
        
        # Create instance
        instance = cls(
            name.group(1),
            raag.group(1),
            taal.group(1),
            tempo.group(1),
            int(beats_per_row.group(1))
        )
        
        # Process composition section
        current_section = None
        
        for line in content.split('\n'):
            line = line.strip()
            if not line or line.startswith('%%') or line.startswith('@'):
                continue
                
            if line.startswith('#'):
                current_section = line
                instance.builder.add_section_header(line)
            elif line.startswith('b:'):
                # Extract beats, handling potential malformed brackets
                line = line[2:].strip()
                # Fix malformed brackets if needed
                line = line.replace('][', '] [')
                beats = re.findall(r'\[.*?\]|[^\s\[\]]+', line)
                
                processed_beats = []
                beat_position = 1
                
                for beat in beats:
                    lyrics, notes = instance.standardize_beat(beat)
                    processed_beats.append([
                        beat_position,
                        lyrics or "-",
                        notes or "-"
                    ])
                    beat_position += 1
                
                if processed_beats:
                    instance.builder.add_line(processed_beats)
                    instance.builder.current_beat = 1
        
        return instance
    
    def is_valid_note(self, text: str) -> bool:
        """Check if the given text contains only valid note characters.
        
        Valid notes:
        - UPPERCASE S R G M P D N
        - With upper octave mark: S' R' G' M' P' D' N'
        - With lower octave mark: .S .R .G .M .P .D .N
        """
        # Handle compound notes
        if ' ' in text:
            return all(self._is_single_note_with_octave(note) for note in text.split())
        return self._is_single_note_with_octave(text)

    def _is_single_note_with_octave(self, text: str) -> bool:
        """Helper to validate a single note with optional octave.
        
        Valid formats:
        - S (middle octave)
        - S' (upper octave)
        - .S (lower octave)
        """
        return bool(re.match(r'^[.]?[SRGMPDN]\'?$', text))

    def process_sustain(self, beat: str) -> tuple[Optional[str], Optional[str]]:
        """Process sustain notation in a beat"""
        if beat == '*':
            return None, '*'
        return None, None

    def is_valid_compound_notes(self, text: str) -> bool:
        """Check if text is a valid compound note sequence.
        Only uppercase S R G M P D N are allowed."""
        return bool(re.match(r'^[SRGMPDN]+$', text))

    def parse_input(self, user_input: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
        """Parse user input using the same logic as file parsing.
        Returns (lyrics, notes, beat_jump) tuple."""
        
        # Handle empty input
        if not user_input or user_input.strip() == '-':
            return None, None, None
        
        # Check for beat jump notation (4)S
        beat_jump = None
        if user_input.startswith('('):
            match = re.match(r'\((\d+)\)(.*)', user_input)
            if match:
                beat_jump = int(match.group(1))
                user_input = match.group(2).strip()
        
        # Split into beats, preserving brackets
        beats = []
        current_beat = []
        in_brackets = False
        
        for char in user_input:
            if char == '[':
                in_brackets = True
            elif char == ']':
                in_brackets = False
                current_beat.append(char)
                if current_beat:
                    beats.append(''.join(current_beat))
                    current_beat = []
                continue
            
            if char == ' ' and not in_brackets:
                if current_beat:
                    beats.append(''.join(current_beat))
                    current_beat = []
            else:
                current_beat.append(char)
        
        if current_beat:
            beats.append(''.join(current_beat))
        
        # Process each beat
        processed_beats = []
        for beat in beats:
            if beat.strip():  # Skip empty beats
                lyrics, notes = self.standardize_beat(beat)
                processed_beats.append((lyrics, notes))
        
        if len(processed_beats) > 1:
            # Multiple beats
            return None, processed_beats, beat_jump
        elif processed_beats:
            # Single beat
            return processed_beats[0][0], processed_beats[0][1], beat_jump
        
        return None, None, beat_jump

    def standardize_beat(self, beat: str) -> tuple[Optional[str], Optional[str]]:
        """Standardize a single beat entry into (lyrics, notes) tuple.
        
        Valid formats:
        - S - R        -> Two beats: (None, "S"), (None, None), (None, "R")
        - [SR-]        -> One beat: (None, "SR-")  # Compound note with silence
        - [SR*]        -> One beat: (None, "SR*")  # Compound note with sustain
        - [S * R]      -> One beat: (None, "S * R")  # Single beat with multiple notes
        - "alb"DG      -> One beat: ("alb", "DG")  # Lyric with compound note
        """
        # Handle empty beat
        if not beat or beat == '-':
            return None, None

        # Handle sustain
        if beat == '*':
            return None, '*'

        # Check if this is a bracketed beat
        is_bracketed = beat.startswith('[') and beat.endswith(']')
        content = beat.strip('[]')
        
        # Handle empty content after removing brackets
        if not content:
            return None, None
        
        # First, extract any quoted lyrics
        lyrics = None
        if '"' in content:
            match = re.search(r'"([^"]+)"', content)
            if match:
                lyrics = match.group(1)
                # Remove the quoted part
                content = content.replace(f'"{lyrics}"', '').strip()
        
        # If no quoted lyrics, check for unquoted lyrics at start
        if not lyrics and not all(c in 'SRGMPDN.-\'* ' for c in content.split()[0]):
            parts = content.split()
            lyrics = parts[0]
            content = ' '.join(parts[1:])
        
        # Process remaining content as notes
        notes = None
        if content:
            if is_bracketed:
                # For bracketed content, preserve exact spacing
                notes = content.strip()
            else:
                # For unbracketed content, normalize spaces
                # but only if it's not a compound note
                if ' ' in content or '-' in content or '*' in content:
                    notes = ' '.join(content.split())
                else:
                    notes = content.replace(' ', '')
        
        return lyrics, notes

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
                        # Format with proper case sensitivity
                        lyrics = lyrics.lower()
                        if self.is_valid_note(notes):
                            notes = notes.upper()
                        processed_beats.append(f'"{lyrics}":{notes}')
                    elif lyrics:
                        processed_beats.append(f'"{lyrics.lower()}"')
                    elif notes:
                        if self.is_valid_note(notes):
                            processed_beats.append(notes.upper())
                        else:
                            processed_beats.append(notes)
                    else:
                        processed_beats.append('-')
                
                current_beats.append(processed_beats)
        
        # Add the last section
        if current_beats:
            lines.append((current_section, current_beats))
        
        # Update the composition with cleaned version
        self.builder.composition_lines = []
        self.builder.current_line = []
        self.builder.current_beat = 1
        self.builder.section_headers = []
        
        for section, beats in lines:
            if section:
                self.builder.add_section_header(section)
            for beat_line in beats:
                processed_line = []
                for i, beat in enumerate(beat_line):
                    if beat == '-':
                        processed_line.append([i + 1, "-", "-"])
                    elif ':' in beat:
                        lyrics, notes = beat.split(':', 1)
                        processed_line.append([i + 1, lyrics.strip('"'), notes])
                    else:
                        processed_line.append([i + 1, "-", beat])
                self.builder.add_line(processed_line)

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
        
        # Get formatted composition lines
        composition_lines = self.builder.get_formatted_composition()
        if composition_lines:
            output.extend(composition_lines)
        
        return '\n'.join(output)

@click.command()
@click.option('--input-file', help='Input .sur file to continue editing', 
              type=click.Path(exists=True))
@click.option('--name', '-n', help='Name of the composition')
@click.option('--raag', '-r', help='Raag of the composition')
@click.option('--taal', '-t', help='Taal of the composition')
@click.option('--tempo', help='Tempo of the composition (vilambit/madhya/drut)')
@click.option('--beats-per-row', type=int, help='Number of beats per row')
@click.option('--output', '-o', help='Output file path')
@click.option('--doctor', is_flag=True, 
              help='Fix formatting of an existing .sur file')
def main(input_file, name, raag, taal, tempo, beats_per_row, output, doctor):
    """Interactive tool to create a .sur file"""
    try:
        if input_file:
            generator = SURFileGenerator.from_file(Path(input_file))
            
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
            # Interactive mode if no command line arguments provided
            if not all([name, raag, taal]):
                name = click.prompt("Enter composition name", type=str)
                raag = click.prompt("Enter raag", type=str)
                taal = click.prompt("Enter taal", type=str)
                tempo = click.prompt("Enter tempo (vilambit/madhya/drut)", 
                                   type=click.Choice(['vilambit', 'madhya', 'drut']), 
                                   default='madhya')
                beats_per_row = click.prompt("Enter beats per row (default based on taal)", 
                                           type=int, 
                                           default=TaalInfo.get_max_beats(taal))
            
            generator = SURFileGenerator(name, raag, taal, tempo or "madhya", 
                                       beats_per_row)

            # Set default output filename if not specified
            if output is None:
                output = f"{name.lower().replace(' ', '-')}.sur"

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
            
            if beat_jump:
                generator.builder.add_empty_beats(beat_jump)
            
            if isinstance(notes, list):
                # Multiple beats
                for beat_lyrics, beat_notes in notes:
                    generator.builder.add_beat(beat_lyrics, beat_notes)
            else:
                # Single beat
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