import Graph from 'graphology';
import parseJSON from './parseJSON';
import parseGEXF from './parseGEXF';
import parseCSV from './parseCSV';
import parseDOT from './parseDOT';
import parseMTX from './parseMTX';

export default async function parseGraphFile(
  graphFile: File,
  format: string = 'auto'
): Promise<Graph> {
  const content = await graphFile.text();

  if (format === 'auto') format = detectFormat(graphFile.name);

  switch (format) {
    case 'json':
      return parseJSON(content);
    case 'gexf':
      return parseGEXF(content);
    case 'mtx':
      return parseMTX(content);
    case 'csv':
      return parseCSV(content);
    case 'dot':
      return parseDOT(content);
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }
}

function detectFormat(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'json';
    case 'gexf':
    case 'xml':
      return 'gexf';
    case 'mtx':
    case 'matrix':
      return 'mtx';
    case 'csv':
    case 'tsv':
    case 'edges':
      return 'csv';
    case 'dot':
      return 'dot';
    default:
      return ext ?? 'unknown';
  }
}
