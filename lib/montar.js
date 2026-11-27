// Monta os números do painel a partir dos dados brutos.
// Roda no navegador (troca de aba instantânea) e também no servidor (página da empresa).
import { situacaoDe } from '@/lib/status';
import { fmtDia, diasDesde, chaveDia } from '@/lib/formato';

export function montar(bruto, { grupo = null, contratoId = null } = {}) {
  if (!bruto || bruto.vazio) return { vazio: true };
  const { atual, anterior, leituras } = bruto;

  const passa = (x) => (!grupo || x.grupo === grupo) && (!contratoId || String(x.contrato_id) === String(contratoId));
  const itens = bruto.itens.filter(passa);
  const aprovados = bruto.aprovados.filter(passa);

  // Total da leitura anterior (para "+N desde a leitura anterior")
  let anteriorAberto = null;
  if (anterior) {
    if (contratoId) anteriorAberto = anterior.porContrato[String(contratoId)] || 0;
    else {
      const b = grupo ? (anterior.por_grupo || {})[grupo] || {} : anterior.por_status || {};
      anteriorAberto = (b.pendente || 0) + (b.correcao || 0) + (b.analise || 0);
    }
  }

  // Histórico: última leitura de cada dia, até 14 dias
  let historico = null;
  if (!contratoId) {
    const porDia = new Map();
    for (const l of leituras) {
      const k = chaveDia(l.criado_em);
      if (!porDia.has(k)) porDia.set(k, l);
    }
    historico = [...porDia.values()].slice(0, 14).reverse().map((l) => {
      const b = grupo ? (l.por_grupo || {})[grupo] || {} : l.por_status || {};
      return { dia: fmtDia(l.criado_em), pendente: b.pendente || 0, correcao: b.correcao || 0, analise: b.analise || 0, aprovado: b.aprovado || 0 };
    });
  }

  const cont = { pendente: 0, correcao: 0, analise: 0, aprovado: aprovados.length };
  for (const i of itens) cont[situacaoDe(i.status)]++;

  const empresas = new Map();
  const empresaDe = (x) =>
    empresas.get(x.contrato_id) || { contrato_id: x.contrato_id, contrato: x.contrato, empresa: x.empresa, grupo: x.grupo, pendente: 0, correcao: 0, analise: 0, aprovado: 0 };
  for (const i of itens) {
    const e = empresaDe(i);
    e[situacaoDe(i.status)]++;
    empresas.set(i.contrato_id, e);
  }
  for (const a of aprovados) {
    const e = empresaDe(a);
    e.aprovado++;
    empresas.set(a.contrato_id, e);
  }
  const listaEmpresas = [...empresas.values()]
    .map((e) => ({ ...e, aberto: e.pendente + e.correcao + e.analise }))
    .sort((a, b) => b.aberto - a.aberto || b.aprovado - a.aprovado);

  const porRelatorio = {};
  for (const i of itens) porRelatorio[i.relatorio] = (porRelatorio[i.relatorio] || 0) + 1;

  const linhas = [
    ...aprovados.map((a) => ({
      id: 'a' + a.id, contrato_id: a.contrato_id, contrato: a.contrato, empresa: a.empresa, relatorio: a.relatorio,
      pessoa: a.pessoa, funcao: a.funcao, documento: a.documento, competencia: a.competencia, status: 'Aprovado',
      situacao: 'aprovado', detalhe: 'aprovado desde a leitura anterior',
    })),
    ...itens.map((i) => {
      const s = situacaoDe(i.status);
      const d = diasDesde(i.primeira_vez);
      const quando = d === 0 ? 'desde hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
      return {
        id: 'i' + i.id, contrato_id: i.contrato_id, contrato: i.contrato, empresa: i.empresa, relatorio: i.relatorio,
        pessoa: i.pessoa, funcao: i.funcao, documento: i.documento, competencia: i.competencia, status: i.status,
        situacao: s, dias: d,
        comentario: s === 'correcao' ? i.comentario || null : null,
        comentario_por: s === 'correcao' ? i.comentario_por || null : null,
        comentario_data: s === 'correcao' ? i.comentario_data || null : null,
        detalhe: (s === 'analise' ? 'aguardando análise ' : s === 'correcao' ? 'em correção ' : 'sem anexo ') + quando + (/\d/.test(i.sla || '') ? ` · SLA ${i.sla}` : ''),
      };
    }),
  ];

  const paradas = itens.filter((i) => situacaoDe(i.status) === 'correcao' && diasDesde(i.primeira_vez) > 7).length;
  const aberto = cont.pendente + cont.correcao + cont.analise;

  return {
    vazio: false,
    atual,
    cont,
    aberto,
    delta: anteriorAberto == null ? null : aberto - anteriorAberto,
    historico,
    empresas: listaEmpresas,
    porRelatorio,
    linhas,
    paradas,
  };
}
