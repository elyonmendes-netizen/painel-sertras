import { supabaseUsuario } from '@/lib/supabase-server';
import { situacaoDe } from '@/lib/status';

import { fmtDia, diasDesde, chaveDia } from '@/lib/formato';
export { fmtDataHora } from '@/lib/formato';

async function todos(consulta) {
  let out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta().range(de, de + 999);
    if (error) throw new Error(error.message);
    out = out.concat(data);
    if (data.length < 1000) break;
  }
  return out;
}

// Carrega tudo que o painel precisa. grupo = "128/2024-RIO" etc. (ou null = todos)
// contratoId = uma empresa específica (ou null)
export async function carregarPainel({ grupo = null, contratoId = null } = {}) {
  const db = await supabaseUsuario();

  const { data: leituras, error } = await db
    .from('leituras')
    .select('id, criado_em, total, por_status, por_grupo, aprovados, contratos_lidos, erros')
    .order('criado_em', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  if (!leituras?.length) return { vazio: true };

  const atual = leituras[0];
  const anterior = leituras[1] || null;

  const filtro = (q) => {
    let r = q.eq('leitura_id', atual.id);
    if (grupo) r = r.eq('grupo', grupo);
    if (contratoId) r = r.eq('contrato_id', contratoId);
    return r;
  };
  const itens = await todos(() => filtro(db.from('itens').select('*')).order('contrato').order('id'));
  const aprovados = await todos(() => filtro(db.from('aprovados').select('*')).order('contrato'));

  // Contagem do item anterior (para "+N desde ontem")
  const contar = (porStatus = {}, porGrupo = {}) => {
    const base = grupo ? porGrupo[grupo] || {} : porStatus;
    return (base.pendente || 0) + (base.correcao || 0);
  };
  let anteriorAberto = null;
  if (anterior && !contratoId) anteriorAberto = contar(anterior.por_status, anterior.por_grupo);
  if (anterior && contratoId) {
    const { count } = await db
      .from('itens')
      .select('id', { count: 'exact', head: true })
      .eq('leitura_id', anterior.id)
      .eq('contrato_id', contratoId)
      .in('status', ['Pendente', 'Pendente Correção']);
    anteriorAberto = count ?? null;
  }

  // Histórico: última leitura de cada dia, até 14 dias
  const porDia = new Map();
  for (const l of leituras) {
    const k = chaveDia(l.criado_em);
    if (!porDia.has(k)) porDia.set(k, l);
  }
  let historico = [...porDia.values()].slice(0, 14).reverse().map((l) => {
    const b = grupo ? (l.por_grupo || {})[grupo] || {} : l.por_status || {};
    return { dia: fmtDia(l.criado_em), pendente: b.pendente || 0, correcao: b.correcao || 0, analise: b.analise || 0, aprovado: b.aprovado || 0 };
  });
  if (contratoId) historico = null; // o histórico por empresa vem do gráfico geral

  // Contagens da leitura atual
  const cont = { pendente: 0, correcao: 0, analise: 0, aprovado: aprovados.length };
  for (const i of itens) cont[situacaoDe(i.status)]++;

  // Por empresa
  const empresas = new Map();
  for (const i of itens) {
    const e = empresas.get(i.contrato_id) || { contrato_id: i.contrato_id, contrato: i.contrato, empresa: i.empresa, grupo: i.grupo, pendente: 0, correcao: 0, analise: 0, aprovado: 0 };
    e[situacaoDe(i.status)]++;
    empresas.set(i.contrato_id, e);
  }
  for (const a of aprovados) {
    const e = empresas.get(a.contrato_id) || { contrato_id: a.contrato_id, contrato: a.contrato, empresa: a.empresa, grupo: a.grupo, pendente: 0, correcao: 0, analise: 0, aprovado: 0 };
    e.aprovado++;
    empresas.set(a.contrato_id, e);
  }
  const listaEmpresas = [...empresas.values()]
    .map((e) => ({ ...e, aberto: e.pendente + e.correcao }))
    .sort((a, b) => b.aberto - a.aberto || b.aprovado - a.aprovado);

  // Por relatório (só o que está em aberto do nosso lado)
  const porRelatorio = {};
  for (const i of itens) {
    const s = situacaoDe(i.status);
    if (s === 'pendente' || s === 'correcao') porRelatorio[i.relatorio] = (porRelatorio[i.relatorio] || 0) + 1;
  }

  // Linhas da tabela (aprovados primeiro, em verde)
  const linhas = [
    ...aprovados.map((a) => ({
      id: 'a' + a.id, contrato_id: a.contrato_id, contrato: a.contrato, empresa: a.empresa, relatorio: a.relatorio,
      pessoa: a.pessoa, funcao: a.funcao, documento: a.documento, competencia: a.competencia, status: 'Saiu da lista',
      situacao: 'aprovado', detalhe: 'saiu da lista nesta leitura (enviado ou aprovado)',
    })),
    ...itens.map((i) => {
      const s = situacaoDe(i.status);
      const d = diasDesde(i.primeira_vez);
      const quando = d === 0 ? 'desde hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
      return {
        id: 'i' + i.id, contrato_id: i.contrato_id, contrato: i.contrato, empresa: i.empresa, relatorio: i.relatorio,
        pessoa: i.pessoa, funcao: i.funcao, documento: i.documento, competencia: i.competencia, status: i.status,
        situacao: s, dias: d, detalhe: (s === 'analise' ? 'aguardando Sertras ' : 'em aberto ') + quando + (i.sla ? ` · SLA ${i.sla}` : ''),
      };
    }),
  ];

  const paradas = itens.filter((i) => situacaoDe(i.status) === 'correcao' && diasDesde(i.primeira_vez) > 7).length;

  return {
    vazio: false,
    atual,
    proximaLeitura: 'amanhã às 07:45',
    cont,
    aberto: cont.pendente + cont.correcao,
    delta: anteriorAberto == null ? null : cont.pendente + cont.correcao - anteriorAberto,
    historico,
    empresas: listaEmpresas,
    porRelatorio,
    linhas,
    paradas,
  };
}
