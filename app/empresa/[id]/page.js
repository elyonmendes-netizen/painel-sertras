import Link from 'next/link';
import { carregarPainel } from '@/lib/dados';
import { supabaseUsuario } from '@/lib/supabase-server';
import { SITUACOES } from '@/lib/status';
import Topo from '@/app/componentes/Topo';
import ListaPendencias from '@/app/componentes/ListaPendencias';

export const dynamic = 'force-dynamic';

function Selo({ k, n, rotulo }) {
  const s = SITUACOES[k];
  return (
    <div style={{ background: s.fundo, color: s.texto, borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
      {rotulo || s.rotulo} <b style={{ fontSize: 18, marginLeft: 6 }}>{n}</b>
    </div>
  );
}

export default async function Empresa({ params }) {
  const { id } = await params;
  const db = await supabaseUsuario();
  const {
    data: { user },
  } = await db.auth.getUser();
  const d = await carregarPainel({ contratoId: String(id) });

  const emp = d.vazio ? null : d.empresas[0];
  const pessoas = new Map();
  if (!d.vazio) {
    for (const l of d.linhas) {
      if (!l.pessoa) continue;
      const p = pessoas.get(l.pessoa) || { nome: l.pessoa, funcao: l.funcao, docs: [], aberto: 0 };
      p.docs.push(l);
      if (l.situacao === 'pendente' || l.situacao === 'correcao') p.aberto++;
      pessoas.set(l.pessoa, p);
    }
  }
  const listaPessoas = [...pessoas.values()].sort((a, b) => b.aberto - a.aberto || b.docs.length - a.docs.length);
  const docsEmpresa = d.vazio ? [] : d.linhas.filter((l) => !l.pessoa);

  return (
    <>
      <Topo email={user?.email} atualizadoEm={d.atual?.criado_em} />
      <main className="conteudo">
        <Link href={emp ? `/?contrato=${encodeURIComponent(emp.grupo)}` : '/'} style={{ fontSize: 14, textDecoration: 'none' }}>← Voltar</Link>
        {!emp ? (
          <section className="cartao">
            <h1 className="titulo" style={{ fontSize: 24 }}>Nenhuma pendência para esta empresa</h1>
            <p className="sub">Na última leitura não apareceu nada em aberto nem aprovado para este contrato.</p>
          </section>
        ) : (
          <>
            <div className="linha-titulo">
              <div>
                <div className="kpi-rot">{emp.grupo}</div>
                <h1 className="titulo" style={{ fontSize: 28, marginTop: 4 }}>{emp.contrato} · {emp.empresa}</h1>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Selo k="pendente" n={emp.pendente} />
                <Selo k="correcao" n={emp.correcao} rotulo="Correção" />
                <Selo k="aprovado" n={emp.aprovado} rotulo="Resolvidos" />
              </div>
            </div>

            <div className="duas-col">
              <section className="cartao col-larga">
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Por colaborador ({listaPessoas.length})</h2>
                {listaPessoas.length === 0 && <p className="cinza">Nenhum documento de pessoa nesta leitura.</p>}
                {listaPessoas.map((p) => (
                  <div key={p.nome} style={{ borderTop: '1px solid #F3F4F6', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, flexWrap: 'wrap' }}>
                      <span><b>{p.nome}</b> {p.funcao && <span className="cinza">· {p.funcao}</span>}</span>
                      <span className="cinza">{p.aberto} em aberto</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.docs.map((x) => {
                        const s = SITUACOES[x.situacao];
                        return (
                          <span key={x.id} className="etq" style={{ background: s.fundo, color: s.texto }} title={x.status + ' · ' + x.detalhe}>
                            {x.documento}{x.competencia && x.competencia !== '--' ? ` ${x.competencia}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
              <div className="col-estreita">
                <section className="cartao">
                  <h2 style={{ fontSize: 16, marginBottom: 12 }}>Documentos da empresa</h2>
                  {docsEmpresa.length === 0 && <p className="cinza">Nada pendente.</p>}
                  {docsEmpresa.map((x) => {
                    const s = SITUACOES[x.situacao];
                    return (
                      <div className="lin-simples" key={x.id}>
                        <span>{x.documento}{x.competencia && x.competencia !== '--' ? ` · ${x.competencia}` : ''}</span>
                        <span className="etq" style={{ background: s.fundo, color: s.texto }}>{s.rotulo}</span>
                      </div>
                    );
                  })}
                </section>
              </div>
            </div>

            <ListaPendencias linhas={d.linhas} linkExportar={`/exportar?empresa=${encodeURIComponent(id)}`} mostrarEmpresa={false} />
          </>
        )}
      </main>
    </>
  );
}
