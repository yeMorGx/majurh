'use client';

import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ExistingCandidate = {
  id: string;
  full_name: string;
  cpf: string;
  cpf_normalized: string;
  rg: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
};

type FormState = {
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  notes: string;
};

const initialForm: FormState = { full_name: '', cpf: '', rg: '', birth_date: '', phone: '', email: '', city: '', state: '', notes: '' };

export function NewCandidateForm() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [duplicateCandidate, setDuplicateCandidate] = useState<ExistingCandidate | null>(null);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.organization?.id) setOrganizationId(payload.data.organization.id);
        else setErrors(['Seu usuário ainda não está associado a uma organização.']);
      })
      .catch(() => setErrors(['Não foi possível carregar seu acesso.']));
  }, []);

  useEffect(() => {
    const normalizedCpf = form.cpf.replace(/\D/g, '');
    if (!organizationId || normalizedCpf.length !== 11) {
      setDuplicateCandidate(null);
      setCheckingCpf(false);
      return;
    }

    let active = true;
    setCheckingCpf(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ organizationId, q: normalizedCpf, page: '1', pageSize: '10' });
        const response = await fetch(`/api/candidates?${params}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!active) return;
        const match = (payload.data ?? []).find((candidate: ExistingCandidate) => candidate.cpf_normalized === normalizedCpf || candidate.cpf.replace(/\D/g, '') === normalizedCpf);
        setDuplicateCandidate(match ?? null);
        if (match) {
          setForm((current) => ({
            ...current,
            full_name: match.full_name,
            rg: match.rg ?? '',
            birth_date: match.birth_date ?? '',
            phone: match.phone ?? '',
            email: match.email ?? '',
            city: match.city ?? '',
            state: match.state ?? '',
            notes: match.notes ?? '',
          }));
        }
      } catch {
        if (active) setDuplicateCandidate(null);
      } finally {
        if (active) setCheckingCpf(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.cpf, organizationId]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'cpf') setErrors([]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateCandidate) {
      setErrors(['Este CPF já está cadastrado. Abra o histórico do candidato existente para criar uma nova participação.']);
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setErrors(payload.fields ?? [payload.error ?? 'Não foi possível salvar o candidato.']);
        return;
      }
      router.push(`/candidatos/${payload.data.id}`);
    } catch {
      setErrors(['Não foi possível salvar o candidato. Tente novamente.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section">
        <h2>Dados pessoais</h2>
        <p>Comece pelos dados que ajudam o RH a encontrar essa pessoa depois.</p>
        <div className="form-grid">
          <div className="field field-full"><label htmlFor="full_name">Nome completo *</label><input className="form-input" id="full_name" required value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="Ex.: Maria Souza" /></div>
          <div className="field"><label htmlFor="cpf">CPF *</label><input className="form-input mono" id="cpf" required value={form.cpf} onChange={(event) => update('cpf', event.target.value)} placeholder="000.000.000-00" aria-describedby="cpf-hint" />{checkingCpf && <small id="cpf-hint">Buscando na base interna…</small>}{!checkingCpf && !duplicateCandidate && form.cpf.replace(/\D/g, '').length === 11 && <small id="cpf-hint">Nenhuma ficha encontrada. Continue para cadastrar.</small>}{duplicateCandidate && <div className="duplicate-alert" role="alert"><span className="duplicate-icon"><Icon name="users" size={16} /></span><span><strong>Dados preenchidos da ficha existente</strong><span>{duplicateCandidate.full_name} já possui um histórico no RH. A ficha foi preenchida automaticamente.</span><Link href={`/candidatos/${duplicateCandidate.id}`}>Abrir histórico <Icon name="arrow-up-right" size={13} /></Link></span></div>}</div>
          <div className="field"><label htmlFor="rg">RG</label><input className="form-input" id="rg" value={form.rg} onChange={(event) => update('rg', event.target.value)} placeholder="Número do documento" /></div>
          <div className="field"><label htmlFor="birth_date">Data de nascimento</label><input className="form-input" id="birth_date" type="date" value={form.birth_date} onChange={(event) => update('birth_date', event.target.value)} /></div>
          <div className="field"><label htmlFor="phone">Telefone</label><input className="form-input" id="phone" type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="(00) 00000-0000" /></div>
          <div className="field"><label htmlFor="email">E-mail</label><input className="form-input" id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="maria@email.com" /></div>
        </div>
      </div>

      <div className="form-section"><h2>Localidade</h2><p>Informações opcionais para contato e organização.</p><div className="form-grid"><div className="field"><label htmlFor="city">Cidade</label><input className="form-input" id="city" value={form.city} onChange={(event) => update('city', event.target.value)} /></div><div className="field"><label htmlFor="state">Estado</label><input className="form-input" id="state" maxLength={2} value={form.state} onChange={(event) => update('state', event.target.value.toUpperCase())} placeholder="SP" /></div></div></div>

      <div className="form-section"><h2>Observações</h2><p>Registre somente o contexto necessário para o processo seletivo.</p><div className="field"><label htmlFor="notes">Notas internas</label><textarea className="form-textarea" id="notes" value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Ex.: indicado por…" /></div></div>

      {errors.length > 0 && <div className="form-error" role="alert"><strong>Revise os dados:</strong><ul style={{ margin: '6px 0 0 18px' }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      <div className="form-actions"><Link href="/candidatos" className="button button-secondary">Cancelar</Link><button className="button button-primary" disabled={loading || checkingCpf || !organizationId || Boolean(duplicateCandidate)}>{duplicateCandidate ? 'CPF já cadastrado' : loading ? 'Salvando…' : 'Salvar candidato'}{!duplicateCandidate && <Icon name="check" size={16} />}</button></div>
    </form>
  );
}
