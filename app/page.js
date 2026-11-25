import Link from 'next/link';
import { carregarPainel } from '@/lib/dados';
import { supabaseUsuario } from '@/lib/supabase-server';
import { GRUPOS, SITUACOES } from '@/lib/status';
import Topo from '@/app/componentes/Topo';
import { GraficoEvolucao, BarrasEmpresas } from '@/app/componentes/Graficos';
import ListaPendencias from '@/app/componentes/ListaPendencias';

export const dynamic = 'force-dynamic';

function Kpi({ rotulo, valor, cor, obs, corObs }) {
  return (
    <div className="cartao">
      <div className="kpi-rot">{rotulo}</div>
      <div className="kpi-num" style={{ color: cor }}>{valor}</div>
      <div className="kpi-obs" style={corObs ? { color: corObs } : undefined}>{obs}</div>
    </div>
  );
}

export default async function Painel({ searchParams }) {
  const sp = await searchParams;
  const grupo = GRUPOS.includes(sp?.contrato) ? sp.contrato : null;
  const db = await supabaseUsuario();
  const {
    data: { user },
  } = await db.auth.getUser();
  const d = await carregarPainel({ grupo });

  if (d.vazio) {
    return (
      <>
        <Topo email={user?.email} />
        <main className="conteudo">
          <section className="cartao">
            <h1 className="titulo" style={{ fontSize: 24 }}>Ainda não há nenhuma leitura</h1>
            <p className="sub">Assim que o coletor do Chrome rodar pela primeira vez, os dados aparecem aqui.</p>
          </section>
        </main>
      </>
    );
  }

  const pct = (n) => (d.aberto > 0 ? Math.round((n / d.aberto) * 100) : 0);
  const top3 = d.empresas.slice(0, 3).reduce((s, e) => s + e.aberto, 0);
  const qs = grupo ? `?contrato=${encodeURIComponent(grupo)}` : '';

  return (
    <>
      <Topo email={user?.email} atualizadoEm={d.atual.criado_em} temErros={(d.atual.erros || []).length > 0} />
      <main className="conteudo">
        <div className="linha-titulo">
          <div>
            <h1 className="titulo" style={{ fontSize: 28 }}>{grupo ? `Contrato ${grupo}` : 'Visão geral'}</h1>
            <p className="sub">Documentos com status Pendente ou Pendente Correção no Sertras (recursos ativos).</p>
          </div>
          <nav className="abas" aria-label="Contrato">
            <Link href="/" className={'aba' + (!grupo ? ' ativa' : '')}>Todos os contratos</Link>
            {GRUPOS.map((g) => (
              <Link key={g} href={`/?contrato=${encodeURIComponent(g)}`} className={'aba' + (grupo === g ? ' ativa' : '')}>{g}</Link>
            ))}
          </nav>
        </div>

        <div className="kpis">
          <Kpi
            rotulo="Total em aberto"
            valor={d.aberto}
            obs={d.delta == null ? 'primeira leitura' : d.delta === 0 ? 'igual a ontem' : `${d.delta > 0 ? '+' : ''}${d.delta} desde a leitura anterior`}
            corObs={d.delta > 0 ? '#B45309' : d.delta < 0 ? '#047857' : undefined}
          />
          <Kpi rotulo="Pendente (não enviado)" valor={d.cont.pendente} cor={SITUACOES.pendente.texto} obs={`${pct(d.cont.pendente)}% da lista`} />
          <Kpi rotulo="Pendente Correção (reprovado)" valor={d.cont.correcao} cor={SITUACOES.correcao.cor} obs="precisam de reenvio" />
          <Kpi rotulo="Resolvidos desde a leitura anterior" valor={d.cont.aprovado} cor={SITUACOES.aprovado.cor} obs="enviados ou aprovados: saíram da lista" corObs={SITUACOES.aprovado.cor} />
        </div>

        <GraficoEvolucao historico={d.historico} />

        <div className="duas-col">
          <BarrasEmpresas empresas={d.empresas} />
          <div className="col-estreita">
            <section className="cartao">
              <h2 style={{ fontSize: 16, marginBottom: 14 }}>Por tipo de relatório</h2>
              {Object.entries(d.porRelatorio)
                .sort((a, b) => b[1] - a[1])
                .map(([r, n]) => (
                  <div className="lin-simples" key={r}>
                    <span>{r}</span>
                    <b>{n}</b>
                  </div>
                ))}
              {Object.keys(d.porRelatorio).length === 0 && <p className="cinza">Nada em aberto.</p>}
            </section>
            <section className="atencao">
              <h2>Atenção</h2>
              <ul>
                <li>Prazo do envio mensal: dia 23</li>
                {d.aberto > 0 && d.empresas.length > 3 && (
                  <li>As 3 empresas com mais pendências somam {Math.round((top3 / d.aberto) * 100)}% do que está em aberto</li>
                )}
                <li>Correções paradas há mais de 7 dias: {d.paradas}</li>
                {(d.atual.erros || []).length > 0 && <li>A última leitura teve {d.atual.erros.length} aviso(s): {d.atual.erros.slice(0, 3).join('; ')}</li>}
              </ul>
            </section>
          </div>
        </div>

        <ListaPendencias linhas={d.linhas} linkExportar={`/exportar${qs}`} />
      </main>
    </>
  );
}
