// Agrupa os status do Sertras nas 4 situações do painel
export const SITUACOES = {
  pendente: { rotulo: 'Pendente', desc: 'documento não anexado', cor: '#F59E0B', fundo: '#FEF3C7', texto: '#92400E' },
  correcao: { rotulo: 'Pendente Correção', desc: 'anexado, precisa de correção', cor: '#1D4ED8', fundo: '#DBEAFE', texto: '#1E3A8A' },
  analise: { rotulo: 'Pendente Sertras', desc: 'anexado, aguardando análise', cor: '#64748B', fundo: '#E2E8F0', texto: '#1E293B' },
  aprovado: { rotulo: 'Aprovado', desc: 'aprovado pelo Sertras', cor: '#059669', fundo: '#D1FAE5', texto: '#065F46' },
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
