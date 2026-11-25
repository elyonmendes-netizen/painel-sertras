// Agrupa os status do Sertras nas 4 situações do painel
export const SITUACOES = {
  pendente: { rotulo: 'Pendente', cor: '#F59E0B', fundo: '#FEF3C7', texto: '#92400E' },
  correcao: { rotulo: 'Pendente Correção', cor: '#1D4ED8', fundo: '#DBEAFE', texto: '#1E3A8A' },
  analise: { rotulo: 'Em análise Sertras', cor: '#64748B', fundo: '#E2E8F0', texto: '#1E293B' },
  aprovado: { rotulo: 'Aprovado', cor: '#059669', fundo: '#D1FAE5', texto: '#065F46' },
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
