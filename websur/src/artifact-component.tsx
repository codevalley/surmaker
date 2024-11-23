import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { SurParser, Note, Beat, Element, ElementType, NotePitch } from './lib/sur-parser';
import type { SurDocument, Section } from './lib/sur-parser/types';
import html2pdf from 'html2pdf.js';
import { SurFormatter } from './lib/sur-parser/formatter';

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

const parseSURFile = (content: string): SurDocument => {
  const parser = new SurParser();
  return parser.parse(content);
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

// Update the SUREditor component
const SUREditor: React.FC<{ content: string; onChange: (content: string) => void }> = ({ content, onChange }) => {
  const [editableContent, setEditableContent] = useState(content);
  const parser = new SurParser();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditableContent(newContent);
    onChange(newContent);
  };

  // Parse the content and get the beats for preview
  let previewContent = '';
  try {
    const surDoc = parser.parse(editableContent);
    const formatter = new SurFormatter();
    
    if (surDoc.composition.sections.length > 0) {
      previewContent = surDoc.composition.sections.map(section => {
        const sectionLines = [`#${section.title}`];
        
        // Group beats into lines
        const beatLines = groupBeatsIntoLines(section.beats);
        
        beatLines.forEach((beatLine) => {
          // Use the formatter to format the line
          const renderedLine = formatter.formatLine(beatLine);
          sectionLines.push(`b: ${renderedLine}`);
        });
        
        return sectionLines.join('\n');
      }).join('\n\n');
    }
  } catch (e) {
    console.error('Error parsing SUR file:', e);
    previewContent = 'Error parsing SUR file';
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={editableContent}
          onChange={handleChange}
          className="font-mono"
          rows={20}
        />
      </div>
      <div className="grid gap-2">
        <label>Preview</label>
        <pre className="p-4 border rounded bg-muted font-mono whitespace-pre-wrap">
          {previewContent}
        </pre>
      </div>
    </div>
  );
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

const SUREditorViewer = () => {
  const [content, setContent] = useState(DEFAULT_SUR);
  const [hideControls, setHideControls] = useState(false);
  
  const toggleControls = () => setHideControls(!hideControls);
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className={hideControls ? 'hidden' : ''}>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit">
            <SUREditor content={content} onChange={setContent} />
          </TabsContent>
          
          <TabsContent value="preview">
            <Card className="w-full">
              <CardHeader className="border-b border-gray-200 pb-6">
                {/* First Row: Title and Download Button */}
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="text-3xl font-bold">
                    {(() => {
                      try {
                        const surDoc = parseSURFile(content);
                        return surDoc.metadata.name || 'Untitled Composition';
                      } catch (e) {
                        return 'Preview';
                      }
                    })()}
                  </CardTitle>
                  {(() => {
                    try {
                      const surDoc = parseSURFile(content);
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
                </div>

                {/* Second Row: Metadata */}
                <div className="cursor-pointer" onClick={toggleControls}>
                  <div className={`metadata-section ${hideControls ? 'hidden' : ''}`}>
                    {(() => {
                      try {
                        const surDoc = parseSURFile(content);
                        return (
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
                        );
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Beat numbers row */}
                  <div className="mb-3 font-mono text-sm">
                    <div className="text-gray-600 mb-0.5">Beat:</div>
                    <div className="grid grid-cols-4 gap-0 border border-gray-200 rounded-lg">
                      {[0, 1, 2, 3].map((group) => (
                        <div key={group} className="border-r border-gray-200 last:border-r-0">
                          <div className="grid grid-cols-4">
                            {[1, 2, 3, 4].map((num) => {
                              const beatNum = group * 4 + num;
                              return (
                                <div
                                  key={beatNum}
                                  className="text-center p-2 border-r border-gray-100 last:border-r-0"
                                  title={`Beat ${beatNum}`}
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
                      const surDoc = parseSURFile(content);
                      const formatter = new SurFormatter();
                      
                      return surDoc.composition.sections.map((section, sectionIdx) => {
                        // Group beats into lines
                        const beatLines = groupBeatsIntoLines(section.beats);

                        return (
                          <div key={sectionIdx} className="space-y-1.5">
                            <h3 className="text-lg font-semibold text-blue-600 mb-2">
                              {section.title}
                            </h3>
                            <div className="font-mono text-sm space-y-2">
                              {beatLines.map((beatLine, lineIdx) => (
                                <div key={`${sectionIdx}-${lineIdx}`} 
                                     className="grid grid-cols-4 gap-0 border border-gray-200 rounded-lg">
                                  {[0, 1, 2, 3].map((group) => (
                                    <div key={group} className="border-r border-gray-200 last:border-r-0">
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
                                              className={`text-center p-2 border-r border-gray-100 last:border-r-0 relative group ${
                                                beat.elements.some(e => e.lyrics) ? 'text-blue-600' : ''
                                              }`}
                                            >
                                              {formatter.formatBeat(beat)}
                                              {/* Tooltip */}
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
          </TabsContent>
        </Tabs>
      </div>

      <div className={hideControls ? 'mt-0' : 'hidden'}>
        <Card className="w-full">
          {/* ... rest of the viewer component ... */}
        </Card>
      </div>
    </div>
  );
};

export default SUREditorViewer;