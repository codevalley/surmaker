import click
from pathlib import Path
from .editor import SUREditor
from rich.console import Console
from rich.syntax import Syntax

console = Console()


@click.group()
def main():
    """SUR Editor - A command-line editor for Indian classical music notation"""
    pass


@main.command()
@click.argument("filename", type=click.Path(exists=True))
def open(filename):
    """Open and edit a SUR file"""
    editor = SUREditor()
    editor.load_file(Path(filename).read_text())
    editor.start()


@main.command()
def new():
    """Create a new SUR composition"""
    editor = SUREditor()
    editor.new_file()
    editor.start()


if __name__ == "__main__":
    main()
