'use client';
import { useMemo, useState } from 'react';
import { montar } from '@/lib/montar';
import { GRUPOS, SITUACOES } from '@/lib/status';
import { GraficoEvolucao, BarrasEmpresas } from '@/app/componentes/Graficos';
import ListaPendencias from '@/app/componentes/ListaPendencias';

function Kpi({ rotulo, valor, cor, obs, corObs }) {
  return (
    <div className="cartao">
      <div className="kpi-rot">{rotulo}</div>
      <div className="kpi-num" style={{ color: cor }}>{valor}</div>
      <div className="kpi-obs" style={corObs ? { color: corObs } : undefined}>{obs}</div>
    </div>
  );
}

// Recebe os dados uma vez só; a troca de aba é feita aqui no navegador, sem voltar ao servidor.
export default function PainelCliente({ bruto, grupoInicial }) {
  const [grupo, setGrupo] = useState(grupoInicial);
  const d = useMemo(() => montar(bruto, { grupo }), [bruto, grupo]);

  function escolher(g) {
    setGrupo(g);
    const url = g ? `/?contrato=${encodeURIComponent(g)}` : '/';
    window.history.replaceState(null, '', url); // mantém o endereço certo para recarregar ou compartilhar
  }

  const pct = (n) => (d.aberto > 0 ? Math.round((n / d.aberto) * 100) : 0);
  const top3 = d.empresas.slice(0, 3).reduce((s, e) => s + e.aberto, 0);

  return (
    <main className="conteudo">
      <div className="linha-titulo">
        <div>
          <h1 className="titulo" style={{ fontSize: 28 }}>{grupo ? `Contrato ${grupo}` : 'Visão geral'}</h1>
          <p className="sub">Documentos de recursos ativos que ainda não foram aprovados no Sertras.</p>
        </div>
        <nav className="abas" aria-label="Contrato">
          <button type="button" onClick={() => escolher(null)} className={'aba' + (!grupo ? ' ativa' : '')} aria-pressed={!grupo}>
            Todos os contratos
          </button>
          {GRUPOS.map((g) => (
            <button type="button" key={g} onClick={() => escolher(g)} className={'aba' + (grupo === g ? ' ativa' : '')} aria-pressed={grupo === g}>
              {g}
            </button>
          ))}
        </nav>
      </div>

      <div className="kpis">
        <Kpi
          rotulo="Total na lista"
          valor={d.aberto}
          obs={d.delta == null ? 'primeira leitura' : d.delta === 0 ? 'igual à leitura anterior' : `${d.delta > 0 ? '+' : ''}${d.delta} desde a leitura anterior`}
          corObs={d.delta > 0 ? '#B45309' : d.delta < 0 ? '#047857' : undefined}
        />
        <Kpi rotulo="Pendente" valor={d.cont.pendente} cor={SITUACOES.pendente.texto} obs={`documento não anexado · ${pct(d.cont.pendente)}%`} />
        <Kpi rotulo="Pendente Sertras" valor={d.cont.analise} cor={SITUACOES.analise.cor} obs={`anexado, aguardando análise · ${pct(d.cont.analise)}%`} />
        <Kpi rotulo="Pendente Correção" valor={d.cont.correcao} cor={SITUACOES.correcao.cor} obs={`anexado, precisa de correção · ${pct(d.cont.correcao)}%`} />
        <Kpi rotulo="Aprovados desde a leitura anterior" valor={d.cont.aprovado} cor={SITUACOES.aprovado.cor} obs="aprovados pelo Sertras: saíram da lista" corObs={SITUACOES.aprovado.cor} />
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
            {Object.keys(d.porRelatorio).length === 0 && <p className="cinza">Nada na lista.</p>}
          </section>
          <section className="atencao">
            <h2>Atenção</h2>
            <ul>
              <li>Prazo do envio mensal: dia 23</li>
              {d.aberto > 0 && d.empresas.length > 3 && (
                <li>As 3 empresas com mais pendências somam {Math.round((top3 / d.aberto) * 100)}% da lista</li>
              )}
              <li>Pendente Correção há mais de 7 dias: {d.paradas}</li>
              {(d.atual.erros || []).length > 0 && <li>A última leitura teve {d.atual.erros.length} aviso(s): {d.atual.erros.slice(0, 3).join('; ')}</li>}
            </ul>
          </section>
        </div>
      </div>

      <ListaPendencias key={grupo || 'todos'} linhas={d.linhas} />
    </main>
  );
}
