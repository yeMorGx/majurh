'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useState } from 'react';

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
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const [ocrText, setOcrText] = useState('');

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function handleFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      setStatus('Escolha uma foto ou imagem do documento.');
      return;
    }
    setFile(nextFile);
    onFileReady(nextFile);
    setStatus('Documento capturado. Clique em ler dados para preencher a ficha.');
    setOcrText('');
  }

  async function readDocument() {
    if (!file) return;
    setScanning(true);
    setStatus('Lendo o documento…');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      const result = await worker.recognize(file);
      await worker.terminate();
      const text = result.data.text;
      setOcrText(text);
      const fields = extractFields(text);
      onExtract(fields);
      const total = Object.keys(fields).length;
      setStatus(total ? `${total} ${total === 1 ? 'campo encontrado' : 'campos encontrados'}. Revise antes de salvar.` : 'Não foi possível reconhecer os dados. Revise a foto e tente novamente.');
    } catch {
      setStatus('Não foi possível ler o documento. Confira a imagem e tente novamente.');
    } finally {
      setScanning(false);
    }
  }

  return <section className="scanner-card" aria-labelledby="document-scanner-title">
    <div className="scanner-heading"><span className="scanner-icon"><Icon name="scan" size={19} /></span><div><h3 id="document-scanner-title">Escanear documento</h3><p>Capture uma foto do RG ou da CIN. A leitura local sugere os dados da ficha e guarda o arquivo como documento.</p></div></div>
    <div className="scanner-controls"><div className="field"><label htmlFor="scanner-document-type">Tipo do documento</label><select className="form-select" id="scanner-document-type" value={documentType} onChange={(event) => onDocumentTypeChange(event.target.value as 'rg' | 'cin')}><option value="rg">RG — Registro Geral</option><option value="cin">CIN — Carteira de Identidade Nacional</option></select></div><label className="scanner-upload"><Icon name="camera" size={18} /><span><strong>Capturar arquivo</strong><small>JPG, PNG ou câmera do dispositivo</small></span><input type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} /></label></div>
    {preview && <div className="scanner-preview"><img src={preview} alt="Prévia do documento capturado" /><div><strong>{file?.name}</strong><span>O arquivo será anexado ao cadastro após salvar.</span></div><button type="button" className="button button-secondary" onClick={readDocument} disabled={scanning}>{scanning ? 'Lendo…' : 'Ler dados'}<Icon name="file-check" size={15} /></button></div>}
    {status && <p className="scanner-status" role="status">{status}</p>}
    {ocrText && <details className="scanner-raw"><summary>Conferir texto reconhecido</summary><pre>{ocrText}</pre></details>}
  </section>;
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

function formatCpf(value: string) { const numbers = value.replace(/\D/g, '').slice(0, 11); return numbers.length === 11 ? `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}` : value; }
function toIsoDate(value: string) { const [day, month, year] = value.split(/[./-]/); return `${year}-${month}-${day}`; }
function cleanName(value: string) { return value.replace(/\s+/g, ' ').replace(/\s+(CPF|RG|CIN|NASCIMENTO|DATA).*$/i, '').trim(); }
