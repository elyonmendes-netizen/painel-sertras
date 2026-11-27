// As 4 situações do painel e suas cores
export const SITUACOES = {
  pendente: { rotulo: 'Pendente', desc: 'documento não anexado', cor: '#F59E0B', fundo: '#FEF3C7', texto: '#92400E', numero: '#B45309' },
  analise: { rotulo: 'Pendente Sertras', desc: 'anexado, aguardando análise', cor: '#64748B', barra: '#94A3B8', fundo: '#F1F5F9', texto: '#334155', numero: '#334155' },
  correcao: { rotulo: 'Pendente Correção', desc: 'anexado, precisa de correção', cor: '#3B82F6', fundo: '#DBEAFE', texto: '#1E3A8A', numero: '#1D4ED8' },
  aprovado: { rotulo: 'Aprovado', desc: 'aprovado pelo Sertras', cor: '#10B981', fundo: '#D1FAE5', texto: '#065F46', numero: '#047857' },
};

export function situacaoDe(status) {
  const s = (status || '').toLowerCase();
  if (s === 'aprovado') return 'aprovado';
  if (s.includes('sertras')) return 'analise'; // Pendente Sertras / Pendente Sertras Correção
  if (s.includes('corre')) return 'correcao';
  return 'pendente';
}

export const GRUPOS = ['128/2024-RIO', '063/2026-RIO', '058/2026-RIO'];

export function grupoDe(contrato) {
  const m = (contrato || '').match(/\d{3}\/\d{4}-RIO/);
  return m ? m[0] : contrato || 'Outros';
}

export const RELATORIOS = ['Mensal Pessoas', 'Mensal Empresa', 'Integração Pessoas', 'Integração Empresa'];

// "SUB 05 - 128/2024-RIO" -> "SUB 05"; "128/2024-RIO" -> "128/2024"
export function contratoCurto(contrato) {
  const c = contrato || '';
  const sub = c.match(/^SUB \d+/);
  return sub ? sub[0] : c.replace(/-RIO.*$/, '');
}

// Iniciais para o quadradinho da empresa
export function sigla(empresa) {
  const ignorar = /^(LTDA\.?|EIRELI|ME|EPP|S\/?A|DE|DA|DO|DAS|DOS|E|&|-|\d.*)$/i;
  const palavras = (empresa || '').split(/\s+/).filter((p) => p && !ignorar.test(p));
  return ((palavras[0]?.[0] || '') + (palavras[1]?.[0] || '')).toUpperCase() || '—';
}
