import Link from 'next/link';
import { carregarPainel } from '@/lib/dados';
import { supabaseUsuario } from '@/lib/supabase-server';
import { SITUACOES, sigla } from '@/lib/status';
import Topo from '@/app/componentes/Topo';
import ListaPendencias from '@/app/componentes/ListaPendencias';

export const dynamic = 'force-dynamic';

function Selo({ k, n, rotulo }) {
  const s = SITUACOES[k];
  return (
    <div className="selo" style={{ background: s.fundo, color: s.texto }}>
      {rotulo || s.rotulo} <b style={{ color: s.numero }}>{n}</b>
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
      if (l.situacao !== 'aprovado') p.aberto++;
      pessoas.set(l.pessoa, p);
    }
  }
  const listaPessoas = [...pessoas.values()].sort((a, b) => b.aberto - a.aberto || b.docs.length - a.docs.length);
  const docsEmpresa = d.vazio ? [] : d.linhas.filter((l) => !l.pessoa);

  return (
    <>
      <Topo email={user?.email} atualizadoEm={d.atual?.criado_em} />
      <main className="conteudo">
        <Link href={emp ? `/?contrato=${encodeURIComponent(emp.grupo)}` : '/'} className="voltar">← Voltar ao painel</Link>
        {!emp ? (
          <section className="cartao">
            <h1 className="titulo" style={{ fontSize: 24 }}>Nenhuma pendência para esta empresa</h1>
            <p className="sub">Na última leitura não apareceu nada em aberto nem aprovado para este contrato.</p>
          </section>
        ) : (
          <>
            <div className="linha-titulo">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span className="sigla" style={{ width: 52, height: 52, fontSize: 16, borderRadius: 14 }}>{sigla(emp.empresa)}</span>
                <div>
                  <div className="data-hoje">{emp.contrato}</div>
                  <h1 className="titulo" style={{ fontSize: 26, marginTop: 2 }}>{emp.empresa}</h1>
                </div>
              </div>
              <div className="selos">
                <Selo k="pendente" n={emp.pendente} />
                <Selo k="analise" n={emp.analise} />
                <Selo k="correcao" n={emp.correcao} />
                <Selo k="aprovado" n={emp.aprovado} rotulo="Aprovados" />
              </div>
            </div>

            <div className="linha">
              <section className="cartao col-larga">
                <h2 style={{ marginBottom: 8 }}>Por colaborador <span style={{ color: '#94A3B8', fontWeight: 600 }}>{listaPessoas.length}</span></h2>
                {listaPessoas.length === 0 && <p className="cinza">Nenhum documento de pessoa nesta leitura.</p>}
                {listaPessoas.map((p) => (
                  <div key={p.nome} className="pessoa">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, flexWrap: 'wrap' }}>
                      <span><b>{p.nome}</b> {p.funcao && <span className="cinza">· {p.funcao}</span>}</span>
                      <span className="cinza">{p.aberto} na lista</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.docs.map((x) => {
                        const s = SITUACOES[x.situacao];
                        return (
                          <span key={x.id} className="etq" style={{ background: s.fundo, color: s.texto }} title={x.status + ' · ' + x.detalhe}>
                            <i style={{ background: s.cor }} />
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
                  <h2 style={{ marginBottom: 8 }}>Documentos da empresa</h2>
                  {docsEmpresa.length === 0 && <p className="cinza">Nada pendente.</p>}
                  {docsEmpresa.map((x) => {
                    const s = SITUACOES[x.situacao];
                    return (
                      <div className="lin-simples" key={x.id}>
                        <span>{x.documento}{x.competencia && x.competencia !== '--' ? ` · ${x.competencia}` : ''}</span>
                        <span className="etq" style={{ background: s.fundo, color: s.texto }}><i style={{ background: s.cor }} />{s.rotulo}</span>
                      </div>
                    );
                  })}
                </section>
              </div>
            </div>

            <ListaPendencias linhas={d.linhas} mostrarEmpresa={false} />
          </>
        )}
      </main>
    </>
  );
}
