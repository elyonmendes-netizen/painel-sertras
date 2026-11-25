import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { grupoDe, situacaoDe } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Libera o envio vindo da aba do Sertras (o coletor do Tampermonkey)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-ingest-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const txt = (v) => (v == null ? null : String(v).slice(0, 500));

export async function POST(request) {
  const token = request.headers.get('x-ingest-token');
  if (!process.env.INGEST_TOKEN || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ ok: false, erro: 'token inválido' }, { status: 401, headers: CORS });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400, headers: CORS });
  }
  const recebidos = Array.isArray(corpo.itens) ? corpo.itens : [];
  const erros = Array.isArray(corpo.erros) ? corpo.erros.map(txt) : [];
  const lidos = Array.isArray(corpo.contratosLidos) ? corpo.contratosLidos.map(String) : [];
  if (recebidos.length > 20000) {
    return NextResponse.json({ ok: false, erro: 'itens demais' }, { status: 413, headers: CORS });
  }

  const db = supabaseAdmin();

  // Leitura anterior (para saber desde quando cada item está em aberto e o que saiu da lista)
  const { data: anterior } = await db.from('leituras').select('id').order('criado_em', { ascending: false }).limit(1).maybeSingle();
  let antigos = [];
  if (anterior) {
    for (let de = 0; ; de += 1000) {
      const { data, error } = await db.from('itens').select('*').eq('leitura_id', anterior.id).range(de, de + 999);
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: CORS });
      antigos = antigos.concat(data);
      if (data.length < 1000) break;
    }
  }
  const mapaAntigo = new Map(antigos.map((i) => [i.chave, i]));

  // Monta os itens novos com chave única
  const vistos = new Map();
  const agora = new Date().toISOString();
  const itens = recebidos.map((i) => {
    const base = [i.contrato_id, i.relatorio, i.pessoa, i.evento, i.documento, i.competencia].map((x) => x || '').join('|');
    const n = (vistos.get(base) || 0) + 1;
    vistos.set(base, n);
    const chave = n > 1 ? `${base}#${n}` : base;
    const velho = mapaAntigo.get(chave);
    return {
      chave,
      contrato_id: String(i.contrato_id),
      contrato: txt(i.contrato),
      grupo: grupoDe(i.contrato),
      empresa: txt(i.empresa),
      relatorio: txt(i.relatorio),
      pessoa: txt(i.pessoa),
      funcao: txt(i.funcao),
      evento: txt(i.evento),
      documento: txt(i.documento),
      competencia: txt(i.competencia),
      data_envio: txt(i.data_envio),
      status: txt(i.status) || 'Pendente',
      sla: txt(i.sla),
      primeira_vez: velho ? velho.primeira_vez : agora,
    };
  });

  // Contratos que NÃO foram lidos com sucesso agora: mantém os itens da leitura anterior,
  // para não sumirem do painel por causa de uma falha de leitura
  const lidosSet = new Set(lidos);
  const chavesLidas = new Set(itens.map((i) => i.chave));
  for (const a of antigos) {
    if (!lidosSet.has(String(a.contrato_id)) && !chavesLidas.has(a.chave)) {
      const { id: _id, leitura_id: _l, ...resto } = a;
      itens.push(resto);
    }
  }

  // Saíram da lista = aprovados pelo Sertras (só conta contratos lidos por completo agora)
  const chavesNovas = new Set(itens.map((i) => i.chave));
  const aprovados = antigos
    .filter((a) => !chavesNovas.has(a.chave) && lidosSet.has(String(a.contrato_id)))
    .map((a) => ({
      chave: a.chave, contrato_id: a.contrato_id, contrato: a.contrato, grupo: a.grupo, empresa: a.empresa,
      relatorio: a.relatorio, pessoa: a.pessoa, funcao: a.funcao, evento: a.evento, documento: a.documento,
      competencia: a.competencia, ultimo_status: a.status, primeira_vez: a.primeira_vez,
    }));

  // Totais para o gráfico
  const por_status = {};
  const por_grupo = {};
  for (const i of itens) {
    const s = situacaoDe(i.status);
    por_status[s] = (por_status[s] || 0) + 1;
    por_grupo[i.grupo] = por_grupo[i.grupo] || {};
    por_grupo[i.grupo][s] = (por_grupo[i.grupo][s] || 0) + 1;
  }
  for (const a of aprovados) {
    por_status.aprovado = (por_status.aprovado || 0) + 1;
    por_grupo[a.grupo] = por_grupo[a.grupo] || {};
    por_grupo[a.grupo].aprovado = (por_grupo[a.grupo].aprovado || 0) + 1;
  }

  const { data: leitura, error: e1 } = await db
    .from('leituras')
    .insert({ total: itens.length, por_status, por_grupo, aprovados: aprovados.length, contratos_lidos: lidos.length, erros })
    .select('id')
    .single();
  if (e1) return NextResponse.json({ ok: false, erro: e1.message }, { status: 500, headers: CORS });

  for (let de = 0; de < itens.length; de += 500) {
    const lote = itens.slice(de, de + 500).map((i) => ({ ...i, leitura_id: leitura.id }));
    const { error } = await db.from('itens').insert(lote);
    if (error) {
      await db.from('leituras').delete().eq('id', leitura.id);
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: CORS });
    }
  }
  if (aprovados.length) {
    const { error } = await db.from('aprovados').insert(aprovados.map((a) => ({ ...a, leitura_id: leitura.id })));
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: CORS });
  }

  // Limpeza: apaga a lista detalhada de leituras com mais de 90 dias (os totais ficam)
  const limite = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: velhas } = await db.from('leituras').select('id').lt('criado_em', limite);
  if (velhas?.length) await db.from('itens').delete().in('leitura_id', velhas.map((v) => v.id));

  return NextResponse.json(
    { ok: true, leitura: leitura.id, itens: itens.length, aprovados: aprovados.length },
    { headers: CORS }
  );
}
