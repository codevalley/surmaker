import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { SurParser, SurDocument, Note } from './lib/sur-parser';
import html2pdf from 'html2pdf.js';

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
  beats: (Note | number)[];
  totalBeats?: number;
  groupSize?: number;
}

const processNote = (note: Note): {
  text: string;
  type: 'note' | 'lyrics' | 'special';
  display: string;
} => {
  console.log('Processing note for display:', note);
  
  // Handle special characters first
  if (note.isSpecial) {
    return {
      text: note.sur || '',
      type: 'special',
      display: note.sur === '-' ? '−' : '·'
    };
  }

  // Handle lyrics next (including bracketed lyrics)
  if (note.lyrics) {
    return {
      text: note.lyrics,
      type: 'lyrics',
      display: note.lyrics
    };
  }

  // Handle compound notes (only valid SUR notes)
  if (note.compound) {
    return {
      text: note.compound.map(n => n.sur).join(''),
      type: 'note',
      display: note.compound.map(n => {
        let display = n.sur || '';
        if (n.octave === 'upper') {
          display = `${display}${UPPER_BAR}`;
        } else if (n.octave === 'lower') {
          display = `${display}${LOWER_BAR}`;
        }
        return display;
      }).join('')
    };
  }

  // Handle single SUR notes
  if (note.sur) {
    let display = note.sur;
    if (note.octave === 'upper') {
      display = `${display}${UPPER_BAR}`;
    } else if (note.octave === 'lower') {
      display = `${display}${LOWER_BAR}`;
    }
    return {
      text: note.sur,
      type: 'note',
      display: display
    };
  }

  // Default case
  return {
    text: '',
    type: 'special',
    display: '−'
  };
};

const BeatGrid: React.FC<BeatGridProps> = ({ beats, totalBeats = 16, groupSize = 4 }) => {
  console.log('BeatGrid received beats:', beats);
  const groups = [];
  const beatsToRender = Array.isArray(beats) ? beats : [];

  // Fill with empty beats if needed
  while (beatsToRender.length < totalBeats) {
    beatsToRender.push({ isSpecial: true, sur: '-' });
  }

  // Group beats
  for (let i = 0; i < totalBeats; i += groupSize) {
    const group = beatsToRender.slice(i, i + groupSize);
    groups.push(group);
  }

  const renderNote = (note: Note, index: number) => {
    if ('lyrics' in note) {
      return <span key={index} style={{ color: 'blue' }}>{note.lyrics}</span>;
    }

    if (note.isSpecial) {
      return <span key={index} style={{ color: 'gray' }}>
        {note.sur === '-' ? '−' : '·'}
      </span>;
    }

    const renderSingleNote = (sur: string, octave?: 'upper' | 'middle' | 'lower') => {
      if (octave === 'upper') {
        return `${sur}${UPPER_BAR}`;
      } else if (octave === 'lower') {
        return `${sur}${LOWER_BAR}`;
      }
      return sur;
    };

    if ('mixed' in note) {
      return (
        <span key={index}>
          {note.mixed.map((part, i) => (
            <span key={i}>
              {'lyrics' in part ? (
                <span style={{ color: 'blue' }}>{part.lyrics}</span>
              ) : 'compound' in part ? (
                <span style={{ color: 'black' }}>
                  {part.compound.map((n, j) => renderSingleNote(n.sur, n.octave)).join('')}
                </span>
              ) : (
                <span style={{ color: 'black' }}>
                  {renderSingleNote(part.sur || '', part.octave)}
                </span>
              )}
              {i < note.mixed.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      );
    }

    if ('compound' in note) {
      return (
        <span key={index} style={{ color: 'black' }}>
          {note.compound.map((n, i) => renderSingleNote(n.sur, n.octave)).join('')}
        </span>
      );
    }

    return (
      <span key={index} style={{ color: 'black' }}>
        {renderSingleNote(note.sur || '', note.octave)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-4 gap-0 border border-gray-200 rounded-lg">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="border-r border-gray-200 last:border-r-0">
          <div className="grid grid-cols-4">
            {group.map((beat, beatIndex) => {
              const key = `${groupIndex}-${beatIndex}`;
              if (typeof beat === 'number') {
                return (
                  <div key={key} className="text-center p-1 text-gray-500 text-sm border-r border-gray-100 last:border-r-0">
                    {beat}
                  </div>
                );
              }

              const processedBeat = processNote(beat);
              console.log('Processed beat for display:', processedBeat);
              
              return (
                <div 
                  key={key} 
                  className="text-center p-1 border-r border-gray-100 last:border-r-0 relative group"
                  title={`Beat ${groupIndex * 4 + beatIndex + 1}`}
                >
                  <div className={`text-sm ${
                    processedBeat.type === 'lyrics' ? 'text-blue-600' : 
                    'text-black'
                  }`}>
                    {renderNote(beat, beatIndex)}
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    Beat {groupIndex * 4 + beatIndex + 1}
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

const parseSURFile = (content: string): SurDocument => {
  const parser = new SurParser();
  return parser.parse(content);
};

const PDFExporter = ({ config, composition }) => {
  const generatePDF = () => {
    // Create a hidden div with formatted content
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    // Add title and metadata
    const title = document.createElement('h1');
    title.textContent = config.name || 'Untitled';
    container.appendChild(title);

    const metadata = document.createElement('div');
    metadata.innerHTML = `
      <p><strong>Raag:</strong> ${config.raag || ''}</p>
      <p><strong>Taal:</strong> ${config.taal || ''}</p>
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
        
        const beats = line.beats.map(note => {
          if (typeof note === 'number') return note.toString();
          return note.sur || note.lyrics || '-';
        }).join(' ');
        
        lineDiv.textContent = beats;
        section.appendChild(lineDiv);
      });

      container.appendChild(section);
    });

    // Use html2pdf to generate PDF
    const element = container;
    const opt = {
      margin:       1,
      filename:     `${config.name || 'composition'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
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
  console.log('SURViewer content:', content);
  const surDocument = parseSURFile(content);
  console.log('SURViewer parsed document:', surDocument);
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
              {surDocument.metadata.name || 'Untitled'}
            </CardTitle>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-semibold">Raag:</span> {surDocument.metadata.raag}</p>
                <p><span className="font-semibold">Taal:</span> {surDocument.metadata.taal}</p>
              </div>
              <div>
                <p><span className="font-semibold">Tempo:</span> {surDocument.metadata.tempo}</p>
                <p><span className="font-semibold">Beats per Row:</span> {surDocument.metadata.beats_per_row}</p>
              </div>
            </div>
          </div>
          {!hideControls && (
            <div className="flex gap-2">
              <PDFExporter config={surDocument.metadata} composition={surDocument.composition} />
              <Button 
                variant="outline" 
                onClick={() => {
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${surDocument.metadata.name || 'composition'}.sur`;
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
          {surDocument.composition.sections.map((section, sectionIdx) => {
            console.log('Rendering section:', section);
            return (
              <div key={sectionIdx} className="space-y-1.5">
                <h3 className="text-lg font-semibold text-blue-600 mb-1">{section.name}</h3>
                <div className="font-mono text-sm space-y-2">
                  {section.beats.map((beat, beatIdx) => (
                    <BeatGrid key={beatIdx} beats={beat.notes} />
                  ))}
                </div>
              </div>
            );
          })}
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