import React, { useState, useMemo, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText, Book, Eye, ArrowRightLeft, ArrowUpDown, Copy, Check } from 'lucide-react';
import { SurParser, Note, Beat, Element, ElementType, NotePitch } from './lib/sur-parser';
import type { SurDocument, Section } from './lib/sur-parser/types';
import html2pdf from 'html2pdf.js';
import { SurFormatter } from './lib/sur-parser/formatter';
import debounce from 'lodash/debounce';

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
  const [showPreview, setShowPreview] = useState(false);
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
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top toolbar - remove preview controls from here */}
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
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className={`gap-2 ${showPreview ? 'bg-white shadow-sm' : ''}`}
          >
            <Eye className="h-4 w-4" />
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
            <div className="h-full min-h-[300px] p-3 font-mono text-xs 
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
                      <Check className="h-3 w-3 mr-1.5 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              {/* Preview content */}
              <pre className="whitespace-pre-wrap text-gray-700 pt-10">
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

const PDFExporter: React.FC<{
  config: PDFConfig;
  composition: PDFComposition[];
}> = ({ config, composition }) => {
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
    composition.forEach(group => {
      const section = document.createElement('div');
      section.className = 'section';
      
      const sectionTitle = document.createElement('h2');
      sectionTitle.textContent = group.title;
      section.appendChild(sectionTitle);

      group.lines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'line';
        
        line.beats.forEach(beat => {
          const beatSpan = document.createElement('span');
          
          if (typeof beat === 'number') {
            beatSpan.textContent = beat.toString();
            beatSpan.className = 'text-gray-500';
          } else if (beat.isSpecial) {
            beatSpan.textContent = beat.sur;
            beatSpan.className = 'text-gray-400';
          } else if (beat.lyrics) {
            beatSpan.textContent = beat.lyrics;
            beatSpan.className = 'text-blue-600 font-medium';
          } else if (beat.mixed) {
            beatSpan.textContent = beat.mixed.map(part => {
              if (part.isSpecial) return part.sur;
              if (part.lyrics) return part.lyrics;
              if (part.compound) {
                return part.compound.map(n => renderNoteWithOctave(n)).join('');
              }
              return renderNoteWithOctave(part);
            }).join('');
          } else if (beat.compound) {
            beatSpan.textContent = beat.compound.map(note => 
              renderNoteWithOctave(note)
            ).join('');
          } else {
            beatSpan.textContent = renderNoteWithOctave(beat);
          }
          
          lineDiv.appendChild(beatSpan);
        });
        
        section.appendChild(lineDiv);
      });

      container.appendChild(section);
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
      .text-blue-600 { color: #2563eb; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-400 { color: #9ca3af; }
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

const SUREditorViewer = () => {
  const [content, setContent] = useState(DEFAULT_SUR);
  const [hideControls, setHideControls] = useState(false);
  
  // Memoize the parsed document
  const parsedDoc = useMemo<ParsedSurDoc>(() => {
    try {
      return {
        document: parseSURFile(content),
        error: null
      };
    } catch (e) {
      return {
        document: null,
        error: e as Error
      };
    }
  }, [content]);

  const toggleControls = () => setHideControls(!hideControls);
  
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Hide tabs in compact mode */}
          <div className={hideControls ? 'hidden' : ''}>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="edit" 
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview"
                  className="data-[state=active]:bg-gray-50 data-[state=active]:text-gray-700">
                  View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit">
                <SUREditor content={content} onChange={setContent} />
              </TabsContent>
              
              <TabsContent value="preview">
                <PreviewContent 
                  parsedDoc={parsedDoc}
                  hideControls={hideControls} 
                  toggleControls={toggleControls} 
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Show only preview in compact mode */}
          <div className={hideControls ? '' : 'hidden'}>
            <PreviewContent 
              parsedDoc={parsedDoc}
              hideControls={hideControls} 
              toggleControls={toggleControls} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Update PreviewContent to use the parsed document
interface PreviewContentProps {
  parsedDoc: ParsedSurDoc;
  hideControls: boolean;
  toggleControls: () => void;
}

const BeatLine: React.FC<{
  beatLine: Beat[];
  lineIdx: number;
  hideControls: boolean;
  formatter: SurFormatter;
}> = memo(({ beatLine, lineIdx, hideControls, formatter }) => {
  return (
    <div className={`grid grid-cols-4 gap-0 ${
      hideControls ? '' : 'border border-gray-200 rounded-lg'
    }`}>
      {[0, 1, 2, 3].map((group) => (
        <div key={group} className={`border-r border-gray-200 ${
          hideControls ? 'border-transparent' : ''
        } last:border-r-0`}>
          <div className="grid grid-cols-4">
            {[0, 1, 2, 3].map((num) => {
              const beatIndex = group * 4 + num;
              const beat = beatLine[beatIndex] || {
                elements: [{ note: { pitch: NotePitch.SILENCE } }],
                bracketed: false
              };
              return (
                <div
                  key={beatIndex}
                  className={`text-center ${hideControls ? 'py-0.5' : 'p-2'} ${
                    (beatIndex + 1) % 4 === 0 ? 'border-r border-gray-300' : 
                    hideControls ? 'border-transparent' : 'border-r border-gray-100'
                  } last:border-r-0 relative group ${
                    beat.elements.some(e => e.lyrics) ? 'text-blue-600' : ''
                  }`}
                >
                  {formatter.formatBeat(beat)}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    Beat {lineIdx * 16 + beatIndex + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

const PreviewContent: React.FC<PreviewContentProps> = ({ parsedDoc, hideControls, toggleControls }) => {
  // Now use parsedDoc.document instead of parsing multiple times
  const surDoc = parsedDoc.document;

  if (!surDoc) return null;

  // Calculate total beats
  const totalBeats = surDoc.composition.sections.reduce(
    (sum, section) => sum + section.beats.length,
    0
  );

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-gray-200 pb-4">
        {/* Normal View */}
        <div className={hideControls ? 'hidden' : ''}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-3xl font-bold">
                  {surDoc.metadata.name || 'Untitled Composition'}
                </CardTitle>
                <div className="flex gap-2">
                  {/* PDF Export Button */}
                  {(() => {
                    try {
                      return (
                        <PDFExporter 
                          config={{
                            name: surDoc.metadata.name || 'Untitled',
                            tempo: surDoc.metadata.tempo,
                            beats_per_row: surDoc.metadata.beats_per_row
                          }}
                          composition={surDoc.composition.sections.map(section => ({
                            title: section.title,
                            lines: groupBeatsIntoLines(section.beats).map(line => ({
                              beats: line
                            }))
                          }))}
                        />
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
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
              <div className="bg-gray-50 rounded-lg p-4">
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
            </div>
          </div>
        </div>

        {/* Reading Mode View */}
        <div className={hideControls ? '' : 'hidden'}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">
                {surDoc.metadata.name}
              </h1>
              {(() => {
                return (
                  <div className="flex items-center gap-4 text-base">
                    <span className="font-semibold text-gray-900">{surDoc.metadata.raag}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-semibold text-gray-900">{surDoc.metadata.taal}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-semibold text-gray-900">{surDoc.metadata.tempo}</span>
                  </div>
                );
              })()}
            </div>
            <Button
              variant="default"
              size="icon"
              onClick={toggleControls}
              className="bg-black hover:bg-black/90 text-white"
            >
              <Book className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Beat numbers row */}
          <div className="mb-3 font-mono text-sm">
            <div className="text-gray-600 mb-0.5">Beat:</div>
            <div className={`grid grid-cols-4 gap-0 border border-gray-200 rounded-lg ${
              hideControls ? 'border-transparent' : ''
            }`}>
              {[0, 1, 2, 3].map((group) => (
                <div key={group} className={`border-r border-gray-200 ${
                  hideControls ? 'border-transparent' : ''
                } last:border-r-0`}>
                  <div className="grid grid-cols-4">
                    {[1, 2, 3, 4].map((num) => {
                      const beatNum = group * 4 + num;
                      return (
                        <div
                          key={beatNum}
                          className={`text-center ${hideControls ? 'py-0.5' : 'p-2'} ${
                            beatNum % 4 === 0 ? 'border-r border-gray-300' : 
                            hideControls ? 'border-transparent' : 'border-r border-gray-100'
                          } last:border-r-0`}
                        >
                          {beatNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Composition sections */}
          {(() => {
            try {
              const formatter = new SurFormatter();
              
              return surDoc.composition.sections.map((section, sectionIdx) => {
                const beatLines = groupBeatsIntoLines(section.beats);

                return (
                  <div key={sectionIdx} className="space-y-1.5">
                    <h3 className={`font-semibold text-blue-600 text-center ${
                      hideControls ? 'text-sm' : 'text-lg mb-2'
                    }`}>
                      {section.title}
                    </h3>
                    <div className="font-mono text-sm space-y-2">
                      {beatLines.map((beatLine, lineIdx) => (
                        <BeatLine
                          key={`${sectionIdx}-${lineIdx}`}
                          beatLine={beatLine}
                          lineIdx={lineIdx}
                          hideControls={hideControls}
                          formatter={formatter}
                        />
                      ))}
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

export default SUREditorViewer;