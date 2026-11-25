import { supabaseUsuario } from '@/lib/supabase-server';
import { montar } from '@/lib/montar';

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

const CAMPOS_ITEM = 'id, contrato_id, contrato, grupo, empresa, relatorio, pessoa, funcao, documento, competencia, status, sla, primeira_vez';
const CAMPOS_APROVADO = 'id, contrato_id, contrato, grupo, empresa, relatorio, pessoa, funcao, documento, competencia';

// Busca tudo da última leitura de uma vez (as consultas rodam ao mesmo tempo).
// contratoId: quando informado, traz só aquela empresa (página de detalhe).
export async function carregarBruto({ contratoId = null } = {}) {
  const db = await supabaseUsuario();

  const { data: leituras, error } = await db
    .from('leituras')
    .select('id, criado_em, por_status, por_grupo, erros')
    .order('criado_em', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  if (!leituras?.length) return { vazio: true };

  const atual = leituras[0];
  const anterior = leituras[1] || null;
  const porEmpresa = (q) => (contratoId ? q.eq('contrato_id', String(contratoId)) : q);

  const [itens, aprovados, anteriores] = await Promise.all([
    todos(() => porEmpresa(db.from('itens').select(CAMPOS_ITEM).eq('leitura_id', atual.id)).order('contrato').order('id')),
    todos(() => porEmpresa(db.from('aprovados').select(CAMPOS_APROVADO).eq('leitura_id', atual.id)).order('contrato')),
    anterior ? todos(() => porEmpresa(db.from('itens').select('contrato_id').eq('leitura_id', anterior.id)).order('id')) : [],
  ]);

  const porContrato = {};
  for (const a of anteriores) porContrato[a.contrato_id] = (porContrato[a.contrato_id] || 0) + 1;

  return {
    vazio: false,
    atual: { id: atual.id, criado_em: atual.criado_em, erros: atual.erros || [] },
    anterior: anterior ? { por_status: anterior.por_status, por_grupo: anterior.por_grupo, porContrato } : null,
    leituras: leituras.map((l) => ({ criado_em: l.criado_em, por_status: l.por_status, por_grupo: l.por_grupo })),
    itens,
    aprovados,
  };
}

// Atalho usado pela página da empresa e pelo Excel
export async function carregarPainel({ grupo = null, contratoId = null } = {}) {
  return montar(await carregarBruto({ contratoId }), { grupo, contratoId });
}
