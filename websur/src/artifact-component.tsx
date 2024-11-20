import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

const UPPER_BAR = '\u0304'; // Macron above: S̄
const LOWER_BAR = '\u0332'; // Macron below: S̲

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
  beats: (string | number)[];
  totalBeats?: number;
  groupSize?: number;
}

const processNote = (note: string): {
  text: string;
  type: 'note' | 'lyrics' | 'special';
  display: string;
} => {
  // Handle special characters
  if (note === '-') {
    return {
      text: note,
      type: 'special',
      display: '−' // Using a proper minus sign
    };
  }
  if (note === '*') {
    return {
      text: note,
      type: 'special',
      display: '·' // Using a middle dot
    };
  }

  // Check if the note is uppercase (indicating it's a musical note)
  const isNote = /^[A-Z.'*-]+$/.test(note);
  
  if (!isNote) {
    return {
      text: note,
      type: 'lyrics',
      display: note
    };
  }

  // Handle octave notation for notes
  if (note.includes("'")) {
    // First remove all quotes and split into characters
    const baseNotes = note.replace(/'/g, '').split('');
    const result = baseNotes.map((char, index) => {
      // Check if the original note had a quote after this position
      const originalIndex = note.indexOf(char, note.indexOf(char));
      const nextCharInOriginal = note[originalIndex + 1];
      
      return nextCharInOriginal === "'" ? char + UPPER_BAR : char;
    }).join('');
    
    return {
      text: note.replace(/'/g, ""),
      type: 'note',
      display: result
    };
  } else if (note.startsWith(".")) {
    return {
      text: note.substring(1),
      type: 'note',
      display: note.substring(1).split('').map(char => char + LOWER_BAR).join('')
    };
  }

  return {
    text: note,
    type: 'note',
    display: note
  };
};

const BeatGrid: React.FC<BeatGridProps> = ({ beats, totalBeats = 16, groupSize = 4 }) => {
  const groups = [];
  for (let i = 0; i < totalBeats; i += groupSize) {
    groups.push(beats.slice(i, i + groupSize));
  }
  
  return (
    <div className="flex w-full">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="flex-1 border-r last:border-r-0 border-gray-200">
          <div className="grid grid-cols-4">
            {group.map((beat, beatIdx) => {
              const beatStr = String(beat || '');
              const [lyrics, notes] = beatStr.includes(':') ? beatStr.split(':') : [null, beatStr];
              
              // Process notes for octave notation
              const processedNotes = notes ? notes.split(' ').map(processNote) : [];
              
              return (
                <div
                  key={beatIdx}
                  className="p-1 text-center border-r last:border-r-0 border-gray-100 min-h-[2em] flex items-center justify-center relative group w-[25%]"
                  title={`Beat ${beatIdx + 1 + groupIdx * groupSize}`}
                >
                  <div className="text-sm flex flex-col items-center w-full">
                    {/* Lyrics */}
                    {lyrics && (
                      <div className="text-blue-600 font-medium w-full overflow-hidden text-center">
                        {lyrics}
                      </div>
                    )}
                    
                    {/* Notes */}
                    {processedNotes.length > 0 && (
                      <div className={`font-mono w-full text-center ${lyrics ? "mt-0.5" : ""}`}>
                        {processedNotes.map((n, i) => (
                          <span 
                            key={i} 
                            className={`inline-block mx-0.5 ${
                              n.type === 'note' ? 'text-black' : 
                              n.type === 'special' ? 'text-gray-500' :
                              'text-blue-600'
                            }`}
                          >
                            {n.display}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Beat position tooltip */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2 py-1 rounded -top-8 pointer-events-none transition-opacity">
                    Beat {beatIdx + 1 + groupIdx * groupSize}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const parseSURFile = (content: string) => {
  const sections: Record<string, string[]> = {};
  let currentSection: string | null = null;
  
  content.split('\n').forEach(line => {
    if (line.startsWith('%%')) {
      currentSection = line.substring(2).trim().toLowerCase();
      sections[currentSection] = [];
    } else if (line.trim() && currentSection) {
      sections[currentSection].push(line.trim());
    }
  });
  
  // Parse config into object
  const config: Record<string, string> = {};
  sections.config?.forEach(line => {
    const [key, value] = line.split(':').map(s => s.trim().replace(/"/g, ''));
    config[key] = value;
  });
  
  // Parse composition into structured format
  const composition: Array<{ title: string; lines: Array<{ type: string; beats: string[] }> }> = [];
  let currentGroup = null;
  
  sections.composition?.forEach(line => {
    if (line.startsWith('#')) {
      currentGroup = { title: line.substring(1), lines: [] };
      composition.push(currentGroup);
    } else if (currentGroup && line.trim()) {
      const [type, content] = line.split(':').map(s => s.trim());
      let beats: string[];
      
      // Check if content uses bracketed format
      if (content.includes('[')) {
        // Parse bracketed format
        beats = content.match(/\[(.*?)\]/g)?.map(beat => beat.slice(1, -1)) || [];
      } else {
        // Parse space-separated format
        beats = content.trim().split(/\s+/).map(beat => {
          // Handle quoted lyrics with spaces
          if (beat.startsWith('"') && beat.endsWith('"')) {
            return beat.slice(1, -1);
          }
          return beat;
        });
      }
      
      currentGroup.lines.push({ type, beats });
    }
  });
  
  return { config, composition };
};

const PDFExporter = ({ config, composition }) => {
  const generatePDF = () => {
    // Create a hidden div with formatted content
    const printContent = document.createElement('div');
    printContent.style.display = 'none';
    document.body.appendChild(printContent);

    // Style the content for PDF
    printContent.innerHTML = `
      <div style="font-family: monospace; padding: 16px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">${config.name || 'Untitled'}</h1>
        <div style="margin-bottom: 16px;">
          <p><strong>Raag:</strong> ${config.raag}</p>
          <p><strong>Taal:</strong> ${config.taal}</p>
          <p><strong>Tempo:</strong> ${config.tempo}</p>
        </div>
        <div style="margin-top: 32px;">
          ${generateFormattedNotation(composition)}
        </div>
      </div>
    `;

    // Use browser's print functionality to generate PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${config.name || 'Music Notation'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 16px; }
              @page { size: A4 landscape; margin: 1.5cm; }
            }
            .beat-grid { 
              width: 100%;
              margin-bottom: 6px;
              display: table;
              table-layout: fixed;
              border-collapse: collapse;
            }
            .beat-group { 
              display: table-cell;
              width: 25%;
              border-right: 1px solid #e5e7eb;
            }
            .beat-group:last-child { 
              border-right: none; 
            }
            .beat-group-inner {
              display: table;
              width: 100%;
              table-layout: fixed;
            }
            .beat { 
              display: table-cell;
              width: 25%;
              padding: 3px;
              text-align: center;
              border-right: 1px solid #f3f4f6;
              vertical-align: middle;
            }
            .beat:last-child {
              border-right: none;
            }
            .beat-content {
              display: inline-block;
              width: 100%;
              text-align: center;
              font-size: 0.875rem;
            }
            .beat-lyrics {
              color: #2563eb;
              font-weight: 500;
            }
            .beat-notes {
              color: #000000;
              font-family: monospace;
              margin-top: 0.125rem;
            }
            .beat-special {
              color: #666666;
            }
            .section-title { 
              color: #2563eb; 
              font-size: 18px; 
              margin: 12px 0 6px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Clean up
    document.body.removeChild(printContent);
  };

  const generateFormattedNotation = (composition) => {
    const beatNumbers = Array.from({ length: 16 }, (_, i) => i + 1);

    let html = `
      <div class="beat-grid">
        ${generateBeatGrid(beatNumbers)}
      </div>
    `;

    composition.forEach(group => {
      html += `
        <h3 class="section-title">${group.title}</h3>
        ${group.lines.map(line => `
          <div class="beat-grid">
            ${generateBeatGrid(line.beats)}
          </div>
        `).join('')}
      `;
    });

    return html;
  };

  const generateBeatGrid = (beats) => {
    let html = '';
    for (let i = 0; i < beats.length; i += 4) {
      const group = beats.slice(i, i + 4);
      html += `
        <div class="beat-group">
          <div class="beat-group-inner">
            ${group.map(beat => {
              if (!beat) return '<div class="beat"><div class="beat-content"><span class="beat-special">−</span></div></div>';
              
              const beatStr = String(beat);
              const [lyrics, notes] = beatStr.includes(':') ? beatStr.split(':') : [null, beatStr];
              
              return `
                <div class="beat">
                  <div class="beat-content">
                    ${lyrics ? `<div class="beat-lyrics">${lyrics}</div>` : ''}
                    ${notes ? `
                      <div class="beat-notes">
                        ${(() => {
                          const processedNote = processNote(notes);
                          return processedNote.display;
                        })()}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    return html;
  };

  return (
    <Button 
      onClick={generatePDF}
      className="flex items-center gap-2"
    >
      <Download size={16} />
      Download PDF
    </Button>
  );
};

const SUREditor = ({ content, onChange }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <input 
          type="file" 
          accept=".sur,.txt"
          onChange={handleFileUpload}
          className="mb-4"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[600px] font-mono text-sm p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        spellCheck="false"
      />
    </div>
  );
};

const SURViewer = ({ content, hideControls = false, onTitleClick = undefined }) => {
  const { config, composition } = parseSURFile(content);
  const beatNumbers = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div 
            className={onTitleClick ? "cursor-pointer hover:opacity-80" : ""}
            onClick={onTitleClick}
          >
            <CardTitle className="text-2xl font-bold mb-2">
              {config.name || 'Untitled'}
            </CardTitle>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-semibold">Raag:</span> {config.raag}</p>
                <p><span className="font-semibold">Taal:</span> {config.taal}</p>
              </div>
              <div>
                <p><span className="font-semibold">Tempo:</span> {config.tempo}</p>
                <p><span className="font-semibold">Beats per Row:</span> {config.beats_per_row}</p>
              </div>
            </div>
          </div>
          {!hideControls && (
            <div className="flex gap-2">
              <PDFExporter config={config} composition={composition} />
              <Button 
                variant="outline" 
                onClick={() => {
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${config.name || 'composition'}.sur`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                Download SUR
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Beat numbers row only */}
          <div className="mb-3 font-mono text-sm">
            <div className="text-gray-600 mb-0.5">Beat:</div>
            <BeatGrid beats={beatNumbers} />
          </div>
          
          {/* Composition sections */}
          {composition.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              <h3 className="text-lg font-semibold text-blue-600 mb-1">{group.title}</h3>
              {group.lines.map((line, lineIdx) => (
                <div key={lineIdx} className="font-mono text-sm">
                  <BeatGrid beats={line.beats} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

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
            <SURViewer 
              content={content} 
              hideControls={false}
              onTitleClick={toggleControls}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className={hideControls ? 'mt-0' : 'hidden'}>
        <SURViewer 
          content={content} 
          hideControls={true}
          onTitleClick={toggleControls}
        />
      </div>
    </div>
  );
};

export default SUREditorViewer;