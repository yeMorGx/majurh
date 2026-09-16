'use client';

import { Icon } from '@/components/ui/icon';
import { MAX_DOCUMENT_SIZE_BYTES } from '@/lib/documents/constants';
import { useEffect, useState } from 'react';

const MAX_PDF_PAGES = 8;
const PDF_RENDER_SCALE = 1.6;

type ExtractedFields = {
  full_name?: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
};

export function DocumentScanner({
  documentType,
  onDocumentTypeChange,
  onExtract,
  onFileReady,
}: {
  documentType: 'rg' | 'cin';
  onDocumentTypeChange: (value: 'rg' | 'cin') => void;
  onExtract: (fields: ExtractedFields) => void;
  onFileReady: (file: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const [ocrText, setOcrText] = useState('');

  useEffect(() => {
    if (!file || isPdfFile(file)) {
      if (!file) setPreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function clearFile() {
    setFile(null);
    setPdfPages(null);
    setPreview('');
    setOcrText('');
    onFileReady(null);
  }

  async function handleFile(nextFile: File | null) {
    if (!nextFile) return;
    clearFile();

    if (nextFile.size <= 0 || nextFile.size > MAX_DOCUMENT_SIZE_BYTES) {
      setStatus('O arquivo deve ter entre 1 byte e 6 MB.');
      return;
    }

    if (isPdfFile(nextFile)) {
      setFile(nextFile);
      onFileReady(nextFile);
      setScanning(true);
      setStatus('Preparando o PDF para leitura…');
      try {
        const rendered = await renderPdfPages(nextFile);
        setPdfPages(rendered.pages);
        setPreview(rendered.pages[0].toDataURL('image/jpeg', 0.84));
        const pageMessage = rendered.totalPages > MAX_PDF_PAGES
          ? 'as primeiras ' + MAX_PDF_PAGES + ' páginas serão lidas'
          : rendered.totalPages + (rendered.totalPages === 1 ? ' página será lida' : ' páginas serão lidas');
        setStatus('PDF preparado: ' + pageMessage + '. Clique em ler dados para preencher a ficha.');
      } catch {
        clearFile();
        setStatus('Não foi possível abrir este PDF. Confira o arquivo e tente novamente.');
      } finally {
        setScanning(false);
      }
      return;
    }

    if (nextFile.type !== 'image/jpeg' && nextFile.type !== 'image/png') {
      setStatus('Escolha um PDF, JPG ou PNG do documento.');
      return;
    }

    setFile(nextFile);
    onFileReady(nextFile);
    setStatus('Documento capturado. Clique em ler dados para preencher a ficha.');
  }

  async function readDocument() {
    if (!file) return;
    setScanning(true);
    setStatus(isPdfFile(file) ? 'Lendo o PDF…' : 'Lendo o documento…');
    try {
      let sources: Array<File | HTMLCanvasElement> = [file];
      if (isPdfFile(file)) {
        let pages = pdfPages;
        if (!pages) {
          const rendered = await renderPdfPages(file);
          pages = rendered.pages;
          setPdfPages(pages);
          setPreview(pages[0].toDataURL('image/jpeg', 0.84));
        }
        sources = pages;
      }

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      try {
        let text = '';
        for (const [index, source] of sources.entries()) {
          if (sources.length > 1) setStatus('Lendo página ' + (index + 1) + ' de ' + sources.length + '…');
          const result = await worker.recognize(source);
          text += (text ? '\n\n' : '') + result.data.text;
        }
        setOcrText(text);
        const fields = extractFields(text);
        onExtract(fields);
        const total = Object.keys(fields).length;
        setStatus(total ? total + (total === 1 ? ' campo encontrado' : ' campos encontrados') + '. Revise antes de salvar.' : 'Não foi possível reconhecer os dados. Revise o arquivo e tente novamente.');
      } finally {
        await worker.terminate();
      }
    } catch {
      setStatus('Não foi possível ler o documento. Confira o PDF ou a imagem e tente novamente.');
    } finally {
      setScanning(false);
    }
  }

  const pdfSelected = file ? isPdfFile(file) : false;

  return <section className="scanner-card" aria-labelledby="document-scanner-title">
    <div className="scanner-heading"><span className="scanner-icon"><Icon name="scan" size={19} /></span><div><h3 id="document-scanner-title">Escanear documento</h3><p>Capture uma foto ou envie um PDF do RG ou da CIN. A leitura local sugere os dados da ficha e guarda o arquivo como documento.</p></div></div>
    <div className="scanner-controls"><div className="field"><label htmlFor="scanner-document-type">Tipo do documento</label><select className="form-select" id="scanner-document-type" value={documentType} onChange={(event) => onDocumentTypeChange(event.target.value as 'rg' | 'cin')}><option value="rg">RG — Registro Geral</option><option value="cin">CIN — Carteira de Identidade Nacional</option></select></div><label className="scanner-upload"><Icon name={pdfSelected ? 'file-text' : 'camera'} size={18} /><span><strong>Selecionar arquivo</strong><small>PDF, JPG ou PNG · até 6 MB · câmera disponível</small></span><input type="file" accept="application/pdf,image/jpeg,image/png,.pdf" capture="environment" disabled={scanning} onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; event.currentTarget.value = ''; void handleFile(nextFile); }} /></label></div>
    {preview && <div className="scanner-preview"><img src={preview} alt={pdfSelected ? 'Prévia da primeira página do PDF' : 'Prévia do documento capturado'} /><div><strong>{file?.name}</strong><span>{pdfSelected ? 'Prévia da primeira página. O OCR lê até ' + MAX_PDF_PAGES + ' páginas.' : 'O arquivo será anexado ao cadastro após salvar.'}</span></div><button type="button" className="button button-secondary" onClick={() => void readDocument()} disabled={scanning}>{scanning ? 'Lendo…' : 'Ler dados'}<Icon name="file-check" size={15} /></button></div>}
    {status && <p className="scanner-status" role="status">{status}</p>}
    {ocrText && <details className="scanner-raw"><summary>Conferir texto reconhecido</summary><pre>{ocrText}</pre></details>}
  </section>;
}

async function renderPdfPages(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const pdf = await loadingTask.promise;
    if (!pdf.numPages) throw new Error('PDF sem páginas');

    const pages: HTMLCanvasElement[] = [];
    const totalPages = pdf.numPages;
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      if (!canvas.getContext('2d')) throw new Error('Canvas indisponível');
      await page.render({ canvas, viewport }).promise;
      pages.push(canvas);
    }
    return { pages, totalPages };
  } finally {
    await loadingTask.destroy();
  }
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function extractFields(text: string): ExtractedFields {
  const normalized = text.replace(/\r/g, '');
  const fields: ExtractedFields = {};
  const cpf = normalized.match(/\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}/)?.[0];
  if (cpf) fields.cpf = formatCpf(cpf);
  const date = normalized.match(/\b\d{2}[./-]\d{2}[./-]\d{4}\b/)?.[0];
  if (date) fields.birth_date = toIsoDate(date);
  const name = normalized.match(/(?:nome(?:\s+completo)?|name)\s*[:\-]?\s*([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,})/i)?.[1];
  if (name) fields.full_name = cleanName(name);
  const identity = normalized.match(/(?:registro\s+geral|identidade|\bRG\b|\bCIN\b)\s*[:№nº\.\-\s]*([A-Z0-9.-]{5,})/i)?.[1];
  if (identity) fields.rg = identity.replace(/[^A-Z0-9.-]/gi, '');
  return fields;
}

function formatCpf(value: string) {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers.length === 11 ? numbers.slice(0, 3) + '.' + numbers.slice(3, 6) + '.' + numbers.slice(6, 9) + '-' + numbers.slice(9) : value;
}

function toIsoDate(value: string) {
  const [day, month, year] = value.split(/[./-]/);
  return year + '-' + month + '-' + day;
}

function cleanName(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\s+(CPF|RG|CIN|NASCIMENTO|DATA).*$/i, '').trim();
}
