import { carregarPainel } from '@/lib/dados';
import { GRUPOS, SITUACOES } from '@/lib/status';

export const dynamic = 'force-dynamic';

// Gera um arquivo .csv que abre direto no Excel (separador ; e acentos corretos)
export async function GET(request) {
  const url = new URL(request.url);
  const contrato = url.searchParams.get('contrato');
  const empresa = url.searchParams.get('empresa');
  const d = await carregarPainel({
    grupo: GRUPOS.includes(contrato) ? contrato : null,
    contratoId: empresa || null,
  });
  const linhas = d.vazio ? [] : d.linhas;
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const cab = ['Contrato', 'Empresa', 'Colaborador', 'Função', 'Documento', 'Competência', 'Relatório', 'Status Sertras', 'Situação no painel', 'Detalhe'];
  const corpo = linhas.map((l) =>
    [l.contrato, l.empresa, l.pessoa, l.funcao, l.documento, l.competencia, l.relatorio, l.status, SITUACOES[l.situacao].rotulo, l.detalhe].map(esc).join(';')
  );
  const csv = '﻿' + [cab.join(';'), ...corpo].join('\r\n');
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pendencias-sertras-${hoje}.csv"`,
    },
  });
}
