import React, { useState, useMemo, memo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText, Book, Eye, EyeOff, ArrowRightLeft, ArrowUpDown, Copy, Check, Pencil, Save, Music, LayoutGrid, Rows, History, Timer } from 'lucide-react';
import { SurParser, Note, Beat, Element, ElementType, NotePitch } from './lib/sur-parser';
import type { SurDocument, Section } from './lib/sur-parser/types';
import html2pdf from 'html2pdf.js';
import { SurFormatter } from './lib/sur-parser/formatter';
import debounce from 'lodash/debounce';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow, format } from 'date-fns';

const DEFAULT_SUR = `%% CONFIG
name: "Albela Sajan"
raag: "bhoopali"
taal: "teental"
beats_per_row: "16"
tempo: "drut"

%% SCALE
S -> Sa
r -> Komal Re
R -> Shuddha Re
g -> Komal Ga
G -> Shuddha Ga
m -> Shuddha Ma
M -> Teevra Ma
P -> Pa
d -> Komal Dha
D -> Shuddha Dha
n -> Komal Ni
N -> Shuddha Ni

%% COMPOSITION

#Sthayi
b: [-][-][-][-][-][-][Al][be][-][la][-][sa][-][ja][nn][-]
b: [aa][-][oo][-][re][-][Al][be][-][la][-][sa][-][ja][nn][-]
b: [aa][-][oo][-][re][-][Mo][ra][ati][man][-][-][su][u][kh][-]
b: [paa][-][oo][-][re][-][Al][be][-][la][-][sa][-][ja][nn][-]
b: [aa][-][oo][-][re][-][-][-][-][-][-][-][-][-][-][-]

#Taan1
b: [-][-][-][-][PP][GR][PP][GR][PP][GR][S][SS][DP][SS][DP][SS]
b: [DP][SS][DP][D][SR][GP][-][-][-][-][-][-][RG][PD][-][-]
b: [-][-][-][-][GP][DS][-][-][-][-][-][-][PD][SR][G][R]
b: [S][D][P][G][R][S][Al][be][-][la][-][sa][-][ja][nn][-]
b: [aa][-][oo][-][re][-][Al][be][-][la][-][sa][-][ja][nn][-]
b: [-][aa][-][oo][-][re][-][-][-][-][-][-][-][-][-][-]

#Antara1
b: [-][-][-][-][-][-][-][-][-][-][Cha][uk][Pu][ra][oo][-]
b: [-][man][-][gal][-][gaa][-][o][-][-][Cha][uk][Pu][ra][oo][-]
b: [-][man][-][gal][-][gaa][-][o][-][-][A][ti][Ma][nn][Su][kh]
b: [-][pa][a][-][-][oo][-][-][-][-][A][ti][Ma][nn][Su][kh]
b: [pa][a][oo][-][re][-][Al][be][-][la][-][sa][-][ja][nn][-]
b: [-][aa][-][oo][-][re][-][be][-][la][-][sa][-][ja][nn][-]
b: [aa][-][oo][-][re][-][-][-][-][-][-][-][-][-][-][-]`;

interface BeatGridProps {
  beats: Beat[] | number[];
  totalBeats?: number;
  groupSize?: number;
}

// Unicode combining characters for octave markers
const UPPER_BAR = '\u0305'; // Combining overline
const LOWER_BAR = '\u0332'; // Combining underline

const renderNoteWithOctave = (note: Note): string => {
  if (!note.pitch) return '';
  const noteStr = note.pitch.toString();
  if (note.octave === 1) return `${noteStr}${UPPER_BAR}`;
  if (note.octave === -1) return `${noteStr}${LOWER_BAR}`;
  return noteStr;
};

const renderElement = (element: Element): string => {
  if (!element) return '';
  
  // Get lyrics string if present
  let lyricsStr = '';
  if (element.lyrics) {
    lyricsStr = element.lyrics.includes(' ') ? `"${element.lyrics}"` : element.lyrics;
  }
  
  // Get note string if present
  let noteStr = '';
  if (element.note) {
    noteStr = renderNoteWithOctave(element.note);
  }
  
  // Combine if both present
  if (lyricsStr && noteStr) {
    return `${lyricsStr}:${noteStr}`;
  }
  
  // Return whichever is present
  return lyricsStr || noteStr || '-';
};

const renderBeat = (beat: Beat | number): string => {
  if (typeof beat === 'number') {
    return beat.toString();
  }
  
  if (!beat || !beat.elements || beat.elements.length === 0) {
    return '-';
  }
  
  const elementStrings = beat.elements.map(renderElement);
  
  // Always wrap in brackets if it's marked as bracketed
  if (beat.bracketed) {
    return `[${elementStrings.join(' ')}]`;
  }
  
  // Join without spaces for pure notes
  return elementStrings.join('');
};

// Update the BeatGrid component to handle the new structure
const BeatGrid: React.FC<BeatGridProps> = ({ beats = [], totalBeats = 16, groupSize = 4 }) => {
  // Ensure beats is always an array
  const beatsToRender = [...beats];

  // Fill with empty beats if needed
  while (beatsToRender.length < totalBeats) {
    beatsToRender.push({
      elements: [{ 
        note: { pitch: NotePitch.SILENCE }
      }],
      bracketed: false
    } as Beat);
  }

  return (
    <div className="grid grid-cols-16 gap-1">
      {beatsToRender.map((beat, index) => (
        <div
          key={index}
          className={`border p-2 text-center hover:bg-gray-50 transition-colors ${
            index % groupSize === 0 ? 'border-l-2' : ''
          }`}
          title={`Beat ${index + 1}`}
        >
          {typeof beat === 'number' ? beat : formatter.formatBeat(beat)}
        </div>
      ))}
    </div>
  );
};

// Add parser instance at the top level
const surParser = new SurParser();

// Add this helper to calculate visual length (ignoring combining characters)
const getVisualLength = (str: string): number => {
  // Remove all combining characters (U+0300 to U+036F)
  return str.normalize('NFD')
           .replace(/[\u0300-\u036f]/g, '')
           .length;
};

// Add this helper function to generate beat numbers
const generateBeatNumbers = (maxBeatWidth: number): string => {
  const numbers = Array.from({ length: 16 }, (_, i) => (i + 1).toString());
  return numbers.map(num => num.padEnd(maxBeatWidth, ' ')).join(' ');
};

// Update the preview content generation in SUREditor
const SUREditor: React.FC<{ content: string; onChange: (content: string) => void }> = ({ content, onChange }) => {
  const [editableContent, setEditableContent] = useState(content);
  const [showPreview, setShowPreview] = useState(true);
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const debouncedOnChange = useMemo(
    () => debounce((value: string) => onChange(value), 150),
    [onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditableContent(newContent);
    debouncedOnChange(newContent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setEditableContent(content);
        onChange(content);
      };
      reader.readAsText(file);
    }
  };

  // Parse the content for preview if needed
  let previewContent = '';
  if (showPreview) {
    try {
      const surDoc = surParser.parse(editableContent);
      const formatter = new SurFormatter();
      
      // First pass: calculate max visual beat width
      let maxBeatWidth = 0;
      surDoc.composition.sections.forEach(section => {
        section.beats.forEach(beat => {
          const formattedBeat = formatter.formatBeat(beat);
          const visualLength = getVisualLength(formattedBeat);
          maxBeatWidth = Math.max(maxBeatWidth, visualLength);
        });
      });
      
      maxBeatWidth += 2; // Add padding
      
      // Second pass: format with padding
      if (surDoc.composition.sections.length > 0) {
        previewContent = surDoc.composition.sections.map((section: Section) => {
          const sectionLines = [`#${section.title}`];
          
          // Add beat numbers row
          sectionLines.push(`#: ${generateBeatNumbers(maxBeatWidth)}`);
          
          const beatLines = groupBeatsIntoLines(section.beats);
          
          beatLines.forEach((beatLine) => {
            // Format each beat with padding based on visual length
            const formattedBeats = beatLine.map(beat => {
              const formatted = formatter.formatBeat(beat);
              const visualLength = getVisualLength(formatted);
              const paddingNeeded = maxBeatWidth - visualLength;
              return formatted + ' '.repeat(paddingNeeded);
            });
            
            // Join the padded beats with a space
            sectionLines.push(`b: ${formattedBeats.join(' ')}`);
          });
          
          return sectionLines.join('\n');
        }).join('\n\n');
      }
    } catch (e) {
      console.error('Error parsing SUR file:', e);
      previewContent = 'Error parsing SUR file';
    }
  }

  const handleCopy = async () => {
    try {
      const surDoc = surParser.parse(editableContent);
      const formatter = new SurFormatter();
      
      // First pass: calculate max visual beat width
      let maxBeatWidth = 0;
      surDoc.composition.sections.forEach(section => {
        section.beats.forEach(beat => {
          const formattedBeat = formatter.formatBeat(beat);
          const visualLength = getVisualLength(formattedBeat);
          maxBeatWidth = Math.max(maxBeatWidth, visualLength);
        });
      });
      
      maxBeatWidth += 2; // Add padding
      
      const formattedContent = surDoc.composition.sections.map((section: Section) => {
        const sectionLines = [`#${section.title}`];
        
        // Add beat numbers row
        sectionLines.push(`#: ${generateBeatNumbers(maxBeatWidth)}`);
        
        const beatLines = groupBeatsIntoLines(section.beats);
        
        beatLines.forEach((beatLine) => {
          const formattedBeats = beatLine.map(beat => {
            const formatted = formatter.formatBeat(beat);
            const visualLength = getVisualLength(formatted);
            const paddingNeeded = maxBeatWidth - visualLength;
            return formatted + ' '.repeat(paddingNeeded);
          });
          
          sectionLines.push(`b: ${formattedBeats.join(' ')}`);
        });
        
        return sectionLines.join('\n');
      }).join('\n\n');

      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top toolbar */}
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".sur"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" className="gap-2 bg-white">
              <FileText className="h-4 w-4" />
              Load SUR File
            </Button>
          </label>
          
          <Button
            variant={showPreview ? "default" : "ghost"}
            onClick={() => setShowPreview(!showPreview)}
            className={`gap-2 ${
              showPreview 
                ? 'bg-black hover:bg-black/90 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            {showPreview ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Preview
          </Button>
        </div>
      </div>

      {/* Main editor area */}
      <div className={`flex gap-4 h-full ${isVerticalLayout ? 'flex-col' : 'flex-row'}`}>
        {/* Editor with distinct styling */}
        <div className={`flex-1 ${showPreview ? (isVerticalLayout ? 'h-1/2' : 'w-1/2') : 'w-full'}`}>
          <textarea
            id="content"
            value={editableContent}
            onChange={handleChange}
            className="w-full h-full min-h-[300px] p-4 font-mono text-sm 
                     bg-white border-2 border-blue-100 rounded-lg shadow-sm 
                     focus:ring-2 focus:ring-blue-200 focus:border-blue-300
                     transition-colors duration-200"
            placeholder="Enter your SUR notation here..."
            spellCheck={false}
          />
        </div>

        {/* Preview panel with floating controls */}
        {showPreview && (
          <div className={`flex-1 relative ${isVerticalLayout ? 'h-1/2' : 'w-1/2'}`}>
            {/* Preview content with controls in top-right corner */}
            <div className="h-full min-h-[300px] p-3 font-mono text-sm 
                          bg-gray-50 border border-gray-200 rounded-lg 
                          shadow-sm overflow-auto relative">
              {/* Floating controls in top-right corner */}
              <div className="absolute top-1.5 right-1.5 flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVerticalLayout(!isVerticalLayout)}
                  className="h-6 px-2 text-xs bg-white/80 hover:bg-white shadow-sm"
                >
                  {isVerticalLayout ? (
                    <>
                      <ArrowRightLeft className="h-3 w-3 mr-1.5" />
                      Horizontal
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="h-3 w-3 mr-1.5" />
                      Vertical
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-xs bg-white/80 hover:bg-white shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              {/* Preview content - keep original font size */}
              <pre className="whitespace-pre-wrap text-gray-700 pt-10 text-sm">
                {previewContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Also update the parseSURFile function to use the parser instance
const parseSURFile = (content: string): SurDocument => {
  return surParser.parse(content);
};

// First, let's define some types to help with TypeScript errors
interface PDFConfig {
  name: string;
  tempo?: string;
  beats_per_row?: string;
}

interface PDFComposition {
  title: string;
  lines: Array<{
    beats: Array<{
      lyrics?: string;
      note?: Note;
      isSpecial?: boolean;
      sur?: string;
      mixed?: Array<{
        isSpecial?: boolean;
        lyrics?: string;
        note?: Note;
        compound?: Note[];
      }>;
      compound?: Note[];
    }>;
  }>;
}

interface PDFExporterProps {
  config: {
    name: string;
    tempo?: string;
    beats_per_row?: string;
  };
  composition: Array<{
    title: string;
    lines: Array<{
      beats: Beat[];
    }>;
  }>;
}

const PDFExporter: React.FC<PDFExporterProps> = ({ config, composition }) => {
  const generatePDF = () => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    document.body.appendChild(container);

    // Add title and metadata
    const metadata = document.createElement('div');
    metadata.innerHTML = `
      <h1>${config.name || ''}</h1>
      <p><strong>Tempo:</strong> ${config.tempo || ''}</p>
      <p><strong>Beats per Row:</strong> ${config.beats_per_row || ''}</p>
    `;
    container.appendChild(metadata);

    // Add composition sections
    composition.forEach(section => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'section';
      
      const sectionTitle = document.createElement('h2');
      sectionTitle.textContent = section.title;
      sectionDiv.appendChild(sectionTitle);

      section.lines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'line';
        
        line.beats.forEach(beat => {
          const beatSpan = document.createElement('span');
          beatSpan.textContent = formatter.formatBeat(beat);
          lineDiv.appendChild(beatSpan);
        });
        
        sectionDiv.appendChild(lineDiv);
      });

      container.appendChild(sectionDiv);
    });

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .section { margin-bottom: 24px; }
      .line { 
        display: grid;
        grid-template-columns: repeat(16, 1fr);
        border-left: 1px solid #e5e7eb;
        border-right: 1px solid #e5e7eb;
      }
      .line > span {
        padding: 4px;
        border-right: 1px solid #e5e7eb;
        text-align: center;
      }
      .line > span:last-child {
        border-right: none;
      }
    `;
    container.appendChild(style);

    // Generate PDF
    const opt = {
      margin: 1,
      filename: `${config.name || 'composition'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(container).set(opt).save().then(() => {
      document.body.removeChild(container);
    });
  };

  return (
    <Button 
      variant="default" 
      onClick={generatePDF} 
      className="flex items-center gap-2 bg-black hover:bg-black/90 text-white"
    >
      <Download size={16} />
      Download PDF
    </Button>
  );
};

// Add this helper function at the top level
const groupBeatsIntoLines = (beats: Beat[], beatsPerLine: number = 16): Beat[][] => {
  const lines: Beat[][] = [];
  for (let i = 0; i < beats.length; i += beatsPerLine) {
    lines.push(beats.slice(i, i + beatsPerLine));
  }
  return lines;
};

interface PreviewProps {
  document: SurDocument;
}

const formatter = new SurFormatter();

export function Preview({ document }: PreviewProps) {
  if (!document) return null;

  // Calculate total beats
  const totalBeats = document.composition.sections.reduce(
    (sum, section) => sum + section.beats.length,
    0
  );

  return (
    <div className="preview-container">
      {/* Title Section */}
      <h1 className="text-2xl font-bold mb-4">
        {document.metadata.name || 'Untitled Composition'}
      </h1>

      {/* Metadata Section */}
      <div className="metadata-section mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>Raag:</div>
          <div>{document.metadata.raag || 'Not specified'}</div>
          <div>Taal:</div>
          <div>{document.metadata.taal || 'Not specified'}</div>
          <div>Tempo:</div>
          <div>{document.metadata.tempo || 'Not specified'}</div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section mb-4">
        <p>Total Beats: {totalBeats}</p>
      </div>

      {/* Composition Sections */}
      {document.composition.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="section-container mb-6">
          {/* Section Header */}
          <h2 className="text-xl font-semibold mb-2">
            {section.title || 'Untitled Section'}
          </h2>

          {/* Beats Grid */}
          <div className="grid grid-cols-8 gap-2">
            {section.beats.map((beat, beatIndex) => (
              <div
                key={beatIndex}
                className="border p-2 text-center"
                title={`Beat ${beatIndex + 1}`}
              >
                {formatter.formatBeat(beat)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Add this interface
interface ParsedSurDoc {
  document: SurDocument | null;
  error: Error | null;
}

// First, let's add the StatusBar component
interface FileStats {
  notes: number;
  sections: number;
  rows: number;
}

const StatusBar: React.FC<{
  stats: FileStats;
  lastSaved?: Date;
  onRecentFilesClick: () => void;
  recentFilesCount: number;
}> = ({ stats, lastSaved, onRecentFilesClick, recentFilesCount }) => {
  return (
    <div className="h-8 bg-gray-100 border-t flex items-center px-4 text-sm fixed bottom-0 left-0 right-0">
      {/* Left section with fixed width - reduced gap and more compact layout */}
      <div className="w-[240px] flex items-center gap-3 text-gray-600 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Music className="h-3.5 w-3.5" />
          <span>{stats.notes} beats</span>
        </div>
        <div className="flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>{stats.sections} sections</span>
        </div>
        <div className="flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />
          <span>{stats.rows} taals</span>
        </div>
      </div>
      
      {/* Center section - absolutely positioned */}
      <div className="absolute left-1/2 -translate-x-1/2">
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-gray-500 whitespace-nowrap">
            <History className="h-3.5 w-3.5" />
            <span>Auto saved {formatTimeAgo(lastSaved)}</span>
          </div>
        )}
      </div>
      
      {/* Right section with fixed width */}
      <div className="w-[240px] ml-auto">
        <button
          onClick={onRecentFilesClick}
          className="flex items-center gap-2 hover:bg-gray-200 px-3 py-1 rounded ml-auto whitespace-nowrap"
        >
          <Book className="h-4 w-4" />
          {recentFilesCount} recent files
        </button>
      </div>
    </div>
  );
};

// Add a simple title/save status component
const DocumentHeader: React.FC<{
  title: string;
  onTitleChange: (title: string) => void;
  lastSaved?: Date;
}> = ({ title, onTitleChange, lastSaved }) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2"
        placeholder="Untitled Composition"
      />
      {lastSaved && (
        <span className="text-sm text-gray-500">
          {formatTimeAgo(lastSaved)}
        </span>
      )}
    </div>
  );
};

// Add a recent files sheet component that slides up from bottom
const RecentFilesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  files: SavedFileMetadata[];
  onFileSelect: (id: string) => void;
}> = ({ open, onClose, files, onFileSelect }) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[400px]">
        <SheetHeader>
          <SheetTitle>Recent Files</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              className="text-left p-4 rounded-lg border hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold">{file.name}</h3>
              <div className="text-sm text-gray-500 mt-1">
                {file.metadata.raag} · {file.metadata.taal}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {formatDate(file.lastModified)}
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// First, let's create a TitleBar component
const TitleBar: React.FC<{
  title: string;
  onTitleChange: (title: string) => void;
  activeTab: 'edit' | 'view';
  onTabChange: (tab: 'edit' | 'view') => void;
  onLoadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  lastSaved?: Date;
}> = ({ 
  title, 
  onTitleChange, 
  activeTab,
  onTabChange,
  onLoadFile,
  onSave,
  lastSaved 
}) => {
  return (
    <div className="h-14 border-b bg-white flex items-center px-4 relative">
      {/* Left section */}
      <div className="w-[240px]"> {/* Fixed width to match right section */}
        <div className="relative group">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-xl font-semibold bg-transparent w-full 
                     border-2 border-transparent rounded-lg px-3 py-1
                     focus:outline-none focus:border-blue-100 
                     group-hover:border-gray-100 transition-colors"
            placeholder="Untitled Composition"
          />
          <Pencil className="h-4 w-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 
                          opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Center section - Tab switcher */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => onTabChange('edit')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'edit' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => onTabChange('view')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'view' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            View
          </button>
        </div>
      </div>
      
      {/* Right section */}
      <div className="w-[240px] ml-auto flex justify-end gap-2"> {/* Fixed width to match left section */}
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".sur"
          onChange={onLoadFile}
        />
        <label htmlFor="file-upload">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <div>
              <FileText className="h-4 w-4" />
              Load
            </div>
          </Button>
        </label>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
};

// Add this component for the formatted text preview
const FormattedPreview: React.FC<{
  content: string;
}> = ({ content }) => {
  // Calculate max beat width and format the text
  const formattedContent = useMemo(() => {
    try {
      const surDoc = surParser.parse(content);
      const formatter = new SurFormatter();
      
      // First pass: calculate max visual beat width
      let maxBeatWidth = 0;
      surDoc.composition.sections.forEach(section => {
        section.beats.forEach(beat => {
          const formattedBeat = formatter.formatBeat(beat);
          const visualLength = getVisualLength(formattedBeat);
          maxBeatWidth = Math.max(maxBeatWidth, visualLength);
        });
      });
      
      maxBeatWidth += 2; // Add padding
      
      // Second pass: format with padding
      if (surDoc.composition.sections.length > 0) {
        return surDoc.composition.sections.map((section: Section) => {
          const sectionLines = [`#${section.title}`];
          
          // Add beat numbers row
          sectionLines.push(`#: ${generateBeatNumbers(maxBeatWidth)}`);
          
          const beatLines = groupBeatsIntoLines(section.beats);
          
          beatLines.forEach((beatLine) => {
            const formattedBeats = beatLine.map(beat => {
              const formatted = formatter.formatBeat(beat);
              const visualLength = getVisualLength(formatted);
              const paddingNeeded = maxBeatWidth - visualLength;
              return formatted + ' '.repeat(paddingNeeded);
            });
            
            sectionLines.push(`b: ${formattedBeats.join(' ')}`);
          });
          
          return sectionLines.join('\n');
        }).join('\n\n');
      }
      return '';
    } catch (e) {
      console.error('Error parsing SUR file:', e);
      return 'Error parsing SUR file';
    }
  }, [content]);

  return (
    <pre className="whitespace-pre-wrap font-mono text-sm p-4">
      {formattedContent}
    </pre>
  );
};

// Update the EditorView component to include copy functionality
const EditorView: React.FC<{
  content: string;
  onChange: (content: string) => void;
  isVerticalLayout: boolean;
  onLayoutToggle: () => void;
}> = ({
  content,
  onChange,
  isVerticalLayout,
  onLayoutToggle,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const surDoc = surParser.parse(content);
      const formatter = new SurFormatter();
      
      // First pass: calculate max visual beat width
      let maxBeatWidth = 0;
      surDoc.composition.sections.forEach(section => {
        section.beats.forEach(beat => {
          const formattedBeat = formatter.formatBeat(beat);
          const visualLength = getVisualLength(formattedBeat);
          maxBeatWidth = Math.max(maxBeatWidth, visualLength);
        });
      });
      
      maxBeatWidth += 2; // Add padding
      
      const formattedContent = surDoc.composition.sections.map((section: Section) => {
        const sectionLines = [`#${section.title}`];
        
        // Add beat numbers row
        sectionLines.push(`#: ${generateBeatNumbers(maxBeatWidth)}`);
        
        const beatLines = groupBeatsIntoLines(section.beats);
        
        beatLines.forEach((beatLine) => {
          const formattedBeats = beatLine.map(beat => {
            const formatted = formatter.formatBeat(beat);
            const visualLength = getVisualLength(formatted);
            const paddingNeeded = maxBeatWidth - visualLength;
            return formatted + ' '.repeat(paddingNeeded);
          });
          
          sectionLines.push(`b: ${formattedBeats.join(' ')}`);
        });
        
        return sectionLines.join('\n');
      }).join('\n\n');

      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`flex-1 flex ${isVerticalLayout ? 'flex-col' : 'flex-row'} overflow-hidden`}>
        {/* Editor - darker background */}
        <div className={`${isVerticalLayout ? 'h-1/2' : 'w-1/2'} bg-gray-100`}>
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full p-4 pb-12 font-mono text-sm bg-transparent border-0 
                     focus:ring-0 resize-none"
            spellCheck={false}
          />
        </div>

        {/* Preview with floating controls - pure white background */}
        <div className={`${isVerticalLayout ? 'h-1/2' : 'w-1/2'} border-l relative bg-white`}>
          {/* Floating controls - now truly floating */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLayoutToggle}
              className="h-7 w-7 p-0 rounded-full bg-white/90 hover:bg-white shadow-md backdrop-blur-sm"
            >
              {isVerticalLayout ? (
                <ArrowRightLeft className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 rounded-full bg-white/90 hover:bg-white shadow-md backdrop-blur-sm"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Preview content - add padding at bottom */}
          <div className="overflow-auto h-full pb-12">
            <FormattedPreview content={content} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the main SUREditorViewer component to handle compact mode
const SUREditorViewer = () => {
  const [content, setContent] = useState(DEFAULT_SUR);
  const [title, setTitle] = useState(() => {
    // Initialize title from the default content
    try {
      const doc = surParser.parse(DEFAULT_SUR);
      return doc.metadata.name || "Untitled Composition";
    } catch (e) {
      return "Untitled Composition";
    }
  });
  const [lastSaved, setLastSaved] = useState<Date>();
  const [activeTab, setActiveTab] = useState<'edit' | 'view'>('edit');
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [hideControls, setHideControls] = useState(false);

  // Auto-save functionality
  const debouncedSave = useMemo(
    () => 
      debounce(() => {
        setLastSaved(new Date());
        // TODO: Implement actual save
      }, 2000),
    []
  );

  useEffect(() => {
    debouncedSave();
  }, [content, title]);

  // Calculate stats
  const stats = useMemo(() => {
    try {
      const doc = surParser.parse(content);
      return {
        notes: doc.composition.sections.reduce((sum, section) => 
          sum + section.beats.reduce((beatSum, beat) => 
            beatSum + beat.elements.length, 0), 0),
        sections: doc.composition.sections.length,
        rows: doc.composition.sections.reduce((sum, section) => 
          sum + Math.ceil(section.beats.length / 16), 0)
      };
    } catch (e) {
      return { notes: 0, sections: 0, rows: 0 };
    }
  }, [content]);

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Update title when content changes
  useEffect(() => {
    try {
      const doc = surParser.parse(content);
      if (doc.metadata.name && doc.metadata.name !== title) {
        setTitle(doc.metadata.name);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, [content]);

  // Update content when title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    try {
      const doc = surParser.parse(content);
      // Update the name in the content
      const lines = content.split('\n');
      const nameLineIndex = lines.findIndex(line => line.trim().startsWith('name:'));
      if (nameLineIndex >= 0) {
        lines[nameLineIndex] = `name: "${newTitle}"`;
        setContent(lines.join('\n'));
      }
    } catch (e) {
      // Ignore parsing errors
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50/50">
      {(!hideControls || activeTab === 'edit') && (
        <TitleBar
          title={title}
          onTitleChange={handleTitleChange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLoadFile={handleLoadFile}
          onSave={() => {/* TODO */}}
          lastSaved={lastSaved}
        />
      )}
      
      <div className="flex-1 overflow-hidden">
        {activeTab === 'edit' ? (
          <EditorView
            content={content}
            onChange={setContent}
            isVerticalLayout={isVerticalLayout}
            onLayoutToggle={() => setIsVerticalLayout(!isVerticalLayout)}
          />
        ) : (
          <div className="h-full overflow-auto">
            <PreviewContent
              parsedDoc={{ document: surParser.parse(content), error: null }}
              hideControls={hideControls}
              toggleControls={() => setHideControls(!hideControls)}
            />
          </div>
        )}
      </div>

      {(!hideControls || activeTab === 'edit') && (
        <StatusBar
          stats={stats}
          lastSaved={lastSaved}
          onRecentFilesClick={() => setShowRecentFiles(true)}
          recentFilesCount={0}
        />
      )}

      <RecentFilesSheet
        open={showRecentFiles}
        onClose={() => setShowRecentFiles(false)}
        files={[]}
        onFileSelect={() => {}}
      />
    </div>
  );
};

// Update PreviewContent component's padding
const PreviewContent: React.FC<PreviewContentProps> = ({ 
  parsedDoc, 
  hideControls, 
  toggleControls 
}) => {
  const surDoc = parsedDoc.document;
  if (!surDoc) return null;

  return (
    <Card className="w-full">
      {/* Always show header, but simplified in compact mode */}
      <CardHeader className={`border-b border-gray-200 ${hideControls ? 'py-3' : 'pb-4'} px-12`}>
        <div className="flex justify-between items-center">
          <div className={`flex items-center gap-6 ${hideControls ? 'text-base' : ''}`}>
            <h2 className={hideControls ? 'text-2xl font-medium' : 'text-4xl font-bold'}>
              {surDoc.metadata.name || 'Untitled Composition'}
            </h2>
            {hideControls && (
              <span className="text-sm text-gray-500">
                {[
                  surDoc.metadata.raag,
                  surDoc.metadata.taal,
                  surDoc.metadata.tempo
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!hideControls && (
              <PDFExporter 
                config={{
                  name: surDoc.metadata.name || 'Untitled',
                  tempo: surDoc.metadata.tempo,
                  beats_per_row: surDoc.metadata.beats_per_row
                }}
                composition={surDoc.composition.sections.map(section => ({
                  title: section.title,
                  lines: groupBeatsIntoLines([...section.beats]).map(line => ({
                    beats: line
                  }))
                }))}
              />
            )}
            <Button
              variant={hideControls ? "default" : "outline"}
              size="icon"
              onClick={toggleControls}
              className={hideControls ? "bg-black hover:bg-black/90" : "hover:bg-gray-100"}
            >
              <Book className={`h-4 w-4 ${hideControls ? "text-white" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Show detailed metadata only in full mode */}
        {!hideControls && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <dl className="grid grid-cols-3 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Raag</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {surDoc.metadata.raag || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Taal</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {surDoc.metadata.taal || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Tempo</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {surDoc.metadata.tempo || 'Not specified'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-12">
        <div className="space-y-6">
          {(() => {
            try {
              const formatter = new SurFormatter();
              let rowCounter = 0;  // Track actual beat rows
              
              return surDoc.composition.sections.map((section, sectionIdx) => {
                const beatLines = groupBeatsIntoLines([...section.beats]);

                return (
                  <div key={sectionIdx} className="space-y-2">
                    {/* Section title - no row number */}
                    <h3 className={`font-semibold text-blue-600 text-center ${
                      hideControls ? 'text-sm' : 'text-lg mb-2'
                    }`}>
                      {section.title}
                    </h3>
                    
                    {/* Beat numbers row - no row number */}
                    <div className="font-mono text-xs text-gray-500 ml-8">
                      <div className="grid grid-cols-4 gap-0">
                        {[0, 1, 2, 3].map((group) => (
                          <div key={group} className="grid grid-cols-4">
                            {[1, 2, 3, 4].map((num) => {
                              const beatNum = group * 4 + num;
                              return (
                                <div key={beatNum} className="text-center py-0.5">
                                  {beatNum}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Beat lines with row numbers */}
                    <div className="font-mono text-sm space-y-[0.01rem]">
                      {beatLines.map((beatLine, lineIdx) => {
                        rowCounter++;  // Increment only for actual beat lines
                        return (
                          <div key={lineIdx} className="flex items-center">
                            {/* Row number */}
                            <div className="text-xs text-gray-500 w-8 text-right pr-2 select-none">
                              {rowCounter}
                            </div>
                            {/* Beat grid */}
                            <div className="flex-1 grid grid-cols-4 gap-0">
                              {[0, 1, 2, 3].map((group) => (
                                <div key={group} className={`border-r border-gray-200 ${
                                  hideControls || lineIdx === 0 ? 'border-transparent' : ''
                                } last:border-r-0`}>
                                  <div className="grid grid-cols-4">
                                    {[0, 1, 2, 3].map((num) => {
                                      const beatIndex = group * 4 + num;
                                      const beat = beatLine[beatIndex] || {
                                        elements: [{ note: { pitch: NotePitch.SILENCE } }],
                                        bracketed: false,
                                        position: { row: rowCounter - 1, beat_number: beatIndex }
                                      };
                                      return (
                                        <div
                                          key={beatIndex}
                                          className={`text-center ${hideControls ? 'py-0.5' : 'p-2'} ${
                                            (beatIndex + 1) % 4 === 0 ? 'border-r border-gray-300' : 
                                            hideControls || lineIdx === 0 ? 'border-transparent' : 'border-r border-gray-100'
                                          } last:border-r-0 relative group ${
                                            !hideControls && beat.elements.some(e => e.lyrics) ? 'text-blue-600' : ''
                                          }`}
                                        >
                                          {formatter.formatBeat(beat)}
                                          {/* Updated hover tooltip */}
                                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                                                    bg-black text-white text-xs px-2 py-1 rounded 
                                                    opacity-0 group-hover:opacity-100 transition-opacity 
                                                    duration-200 pointer-events-none whitespace-nowrap">
                                            Taal {rowCounter}, Beat {beatIndex + 1}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            } catch (e) {
              console.error('Error parsing SUR file:', e);
              return <div>Error parsing SUR file</div>;
            }
          })()}
        </div>
      </CardContent>
    </Card>
  );
};

// Add these types
interface SavedFileMetadata {
  id: string;
  name: string;
  lastModified: number;
  metadata: {
    raag?: string;
    taal?: string;
    tempo?: string;
  }
}

// Add these utility functions
const formatTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

const formatDate = (timestamp: number): string => {
  return format(new Date(timestamp), 'MMM d, yyyy');
};

// Add this interface for BeatLine props
interface BeatLineProps {
  beatLine: Beat[];
  lineIdx: number;
  hideControls: boolean;
  formatter: (beat: Beat) => string;
  isNumberRow?: boolean;
}

// Add the BeatLine component
const BeatLine: React.FC<BeatLineProps> = memo(({ 
  beatLine, 
  lineIdx, 
  hideControls, 
  formatter,
  isNumberRow = false
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Add row number */}
      {!isNumberRow && (
        <div className="text-xs text-gray-500 w-8 text-right pr-2 select-none">
          {lineIdx + 1}
        </div>
      )}
      {/* Existing beat grid */}
      <div className={`grid grid-cols-4 gap-0 flex-1 ${
        !isNumberRow && !hideControls ? 'border border-gray-200 rounded-lg' : ''
      }`}>
        {[0, 1, 2, 3].map((group) => (
          <div key={group} className={`border-r border-gray-200 ${
            hideControls || isNumberRow ? 'border-transparent' : ''
          } last:border-r-0`}>
            <div className="grid grid-cols-4">
              {[0, 1, 2, 3].map((num) => {
                const beatIndex = group * 4 + num;
                const beat = beatLine[beatIndex] || {
                  elements: [{ note: { pitch: NotePitch.SILENCE } }],
                  bracketed: false,
                  position: beatIndex
                };
                return (
                  <div
                    key={beatIndex}
                    className={`text-center ${hideControls ? 'py-0.5' : 'p-2'} ${
                      (beatIndex + 1) % 4 === 0 ? 'border-r border-gray-300' : 
                      hideControls || isNumberRow ? 'border-transparent' : 'border-r border-gray-100'
                    } last:border-r-0 relative group ${
                      !isNumberRow && beat.elements.some(e => e.lyrics) ? 'text-blue-600' : ''
                    }`}
                  >
                    {formatter(beat)}
                    {!isNumberRow && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                                    bg-black text-white text-xs px-2 py-1 rounded 
                                    opacity-0 group-hover:opacity-100 transition-opacity 
                                    duration-200 pointer-events-none">
                        Beat {lineIdx * 16 + beatIndex + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Add PreviewContentProps interface
interface PreviewContentProps {
  parsedDoc: ParsedSurDoc;
  hideControls: boolean;
  toggleControls: () => void;
}

export default SUREditorViewer;