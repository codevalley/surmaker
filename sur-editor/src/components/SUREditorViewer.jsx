import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

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
b: [-][-][-][-][-][-][Al][be][-][la][-][sa][-][ja][nn][-]`;

const parseSURFile = (content) => {
  const sections = {};
  let currentSection = null;
  
  content.split('\n').forEach(line => {
    if (line.startsWith('%%')) {
      currentSection = line.substring(2).trim().toLowerCase();
      sections[currentSection] = [];
    } else if (line.trim() && currentSection) {
      sections[currentSection].push(line.trim());
    }
  });
  
  const config = {};
  sections.config?.forEach(line => {
    const [key, value] = line.split(':').map(s => s.trim().replace(/"/g, ''));
    config[key] = value;
  });
  
  const composition = [];
  let currentGroup = null;
  
  sections.composition?.forEach(line => {
    if (line.startsWith('#')) {
      currentGroup = { title: line.substring(1), lines: [] };
      composition.push(currentGroup);
    } else if (currentGroup && line.trim()) {
      const [type, content] = line.split(':').map(s => s.trim());
      const beats = content.match(/\[(.*?)\]/g)?.map(beat => beat.slice(1, -1)) || [];
      currentGroup.lines.push({ type, beats });
    }
  });
  
  return { config, composition };
};

const BeatGrid = ({ beats = [] }) => {
  return (
    <div className="flex w-full min-w-[800px]">
      <div className="flex flex-1 border border-gray-200">
        {beats.map((beat, idx) => (
          <div 
            key={idx}
            className={`
              flex-1 p-2 text-center border-r last:border-r-0 
              ${idx > 0 && idx % 4 === 0 ? 'border-l-2' : ''}
            `}
          >
            {beat || '-'}
          </div>
        ))}
      </div>
    </div>
  );
};

const PDFExporter = ({ config, composition }) => {
  const generatePDF = () => {
    const printContent = document.createElement('div');
    printContent.style.display = 'none';
    document.body.appendChild(printContent);

    const beatNumbers = Array.from({ length: 16 }, (_, i) => i + 1);
    const vibhags = ['×', '2', '3', '4', 'O', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];

    printContent.innerHTML = `
      <div style="font-family: monospace; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">${config.name || 'Untitled'}</h1>
        <div style="margin-bottom: 16px;">
          <p><strong>Raag:</strong> ${config.raag}</p>
          <p><strong>Taal:</strong> ${config.taal}</p>
          <p><strong>Tempo:</strong> ${config.tempo}</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <div style="margin-bottom: 8px;">Beat:</div>
          ${generateBeatGrid(beatNumbers)}
          
          <div style="margin: 8px 0;">Vibhag:</div>
          ${generateBeatGrid(vibhags)}
        </div>

        ${composition.map(group => `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #2563eb; font-size: 18px; margin: 16px 0;">${group.title}</h3>
            ${group.lines.map(line => generateBeatGrid(line.beats)).join('')}
          </div>
        `).join('')}
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${config.name || 'Music Notation'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              @page { size: A4 landscape; margin: 2cm; }
            }
            .beat-grid { 
              display: flex;
              border: 1px solid #ccc;
              margin-bottom: 8px;
              min-width: 800px;
            }
            .beat-cell {
              flex: 1;
              padding: 8px;
              text-align: center;
              border-right: 1px solid #ccc;
            }
            .beat-cell:last-child { border-right: none; }
            .beat-cell:nth-child(4n) { border-right: 2px solid #666; }
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
    document.body.removeChild(printContent);
  };

  const generateBeatGrid = (beats) => {
    return `
      <div class="beat-grid">
        ${beats.map(beat => `
          <div class="beat-cell">${beat || '-'}</div>
        `).join('')}
      </div>
    `;
  };

  return (
    <Button onClick={generatePDF} className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
};

const SURViewer = ({ content }) => {
  const { config, composition } = parseSURFile(content);
  const beatNumbers = Array.from({ length: 16 }, (_, i) => i + 1);
  const vibhags = ['×', '2', '3', '4', 'O', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];

  return (
    <div className="w-full overflow-x-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">{config.name}</CardTitle>
              <div className="grid grid-cols-2 gap-4 mt-4">
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
                <FileText className="h-4 w-4" />
                Download SUR
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Beat:</div>
                <div className="overflow-x-auto">
                  <BeatGrid beats={beatNumbers} />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Vibhag:</div>
                <div className="overflow-x-auto">
                  <BeatGrid beats={vibhags} />
                </div>
              </div>
            </div>

            {composition.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600">{group.title}</h3>
                {group.lines.map((line, lineIdx) => (
                  <div key={lineIdx} className="overflow-x-auto">
                    <BeatGrid beats={line.beats} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SUREditor = ({ content, onChange }) => (
  <div className="w-full space-y-4">
    <input 
      type="file" 
      accept=".sur,.txt"
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
    />
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[600px] font-mono text-sm p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      spellCheck="false"
    />
  </div>
);

const SUREditorViewer = () => {
  const [content, setContent] = useState(DEFAULT_SUR);
  
  return (
    <div className="w-full">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit">
          <SUREditor content={content} onChange={setContent} />
        </TabsContent>
        
        <TabsContent value="preview">
          <SURViewer content={content} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SUREditorViewer;