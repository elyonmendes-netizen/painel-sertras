'use client';
import { useMemo, useState } from 'react';
import { montar } from '@/lib/montar';
import { GRUPOS, SITUACOES } from '@/lib/status';
import Topo from '@/app/componentes/Topo';
import { GraficoEvolucao, PorRelatorio, RankingEmpresas } from '@/app/componentes/Graficos';
import ListaPendencias from '@/app/componentes/ListaPendencias';

function Kpi({ k, valor, obs }) {
  const s = SITUACOES[k];
  return (
    <section className="kpi">
      <div className="kpi-cab">
        <span className="kpi-icone" style={{ background: s.fundo }}>
          <span style={{ background: s.cor }} />
        </span>
        {k === 'aprovado' ? 'Aprovados' : s.rotulo}
      </div>
      <div className="kpi-num" style={{ color: s.numero }}>{valor}</div>
      <div className="kpi-obs">{obs}</div>
    </section>
  );
}

const hojeExtenso = () => {
  const t = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// Recebe os dados uma vez só; a troca de contrato é feita aqui no navegador, sem voltar ao servidor.
export default function PainelCliente({ bruto, grupoInicial, email }) {
  const [grupo, setGrupo] = useState(grupoInicial);
  const d = useMemo(() => montar(bruto, { grupo }), [bruto, grupo]);

  function escolher(g) {
    setGrupo(g);
    window.history.replaceState(null, '', g ? `/?contrato=${encodeURIComponent(g)}` : '/');
  }

  const pct = (n) => (d.aberto > 0 ? Math.round((n / d.aberto) * 100) : 0);
  const delta = d.delta;
  const erros = d.atual.erros || [];

  const seletor = (
    <nav className="segmentos" aria-label="Contrato">
      <button type="button" onClick={() => escolher(null)} aria-pressed={!grupo}>Todos</button>
      {GRUPOS.map((g) => (
        <button type="button" key={g} onClick={() => escolher(g)} aria-pressed={grupo === g}>
          {g.replace('-RIO', '')}
        </button>
      ))}
    </nav>
  );

  return (
    <>
      <Topo email={email} atualizadoEm={d.atual.criado_em} temErros={erros.length > 0} centro={seletor} />
      <main className="conteudo">
        <div className="linha-titulo">
          <div>
            <div className="data-hoje" suppressHydrationWarning>{hojeExtenso()}</div>
            <h1 className="titulo" style={{ fontSize: 30, marginTop: 4 }}>{grupo ? `Contrato ${grupo}` : 'Visão geral'}</h1>
          </div>
          <div className="etiquetas">
            <span className="etiqueta amarela">Envio mensal até dia 23</span>
            {d.paradas > 0 && <span className="etiqueta vermelha">{d.paradas} correç{d.paradas > 1 ? 'ões paradas' : 'ão parada'} há +7 dias</span>}
            {erros.length > 0 && <span className="etiqueta cinza" title={erros.join('\n')}>Última leitura com {erros.length} aviso(s)</span>}
          </div>
        </div>

        <div className="linha">
          <section className="destaque">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div className="destaque-rot">Total na lista</div>
                <div className="destaque-num">{d.aberto}</div>
              </div>
              <span className={'chip-delta' + (delta > 0 ? ' sobe' : delta < 0 ? ' desce' : '')}>
                {delta == null ? 'primeira leitura' : delta === 0 ? 'igual à leitura anterior' : `${delta > 0 ? '+' : ''}${delta} desde a leitura anterior`}
              </span>
            </div>
            <div className="proporcao" role="img" aria-label={`Pendente ${pct(d.cont.pendente)}%, Pendente Sertras ${pct(d.cont.analise)}%, Pendente Correção ${pct(d.cont.correcao)}%`}>
              {d.cont.pendente > 0 && <span style={{ width: pct(d.cont.pendente) + '%', background: SITUACOES.pendente.cor }} />}
              {d.cont.analise > 0 && <span style={{ width: pct(d.cont.analise) + '%', background: SITUACOES.analise.barra }} />}
              {d.cont.correcao > 0 && <span style={{ width: pct(d.cont.correcao) + '%', background: SITUACOES.correcao.cor }} />}
            </div>
            <div className="proporcao-legenda">
              <span><b style={{ color: '#FBBF24' }}>●</b> Pendente {pct(d.cont.pendente)}%</span>
              <span><b style={{ color: '#94A3B8' }}>●</b> Pendente Sertras {pct(d.cont.analise)}%</span>
              <span><b style={{ color: '#60A5FA' }}>●</b> Pendente Correção {pct(d.cont.correcao)}%</span>
            </div>
          </section>
          <Kpi k="pendente" valor={d.cont.pendente} obs={SITUACOES.pendente.desc} />
          <Kpi k="analise" valor={d.cont.analise} obs={SITUACOES.analise.desc} />
          <Kpi k="correcao" valor={d.cont.correcao} obs={SITUACOES.correcao.desc} />
          <Kpi k="aprovado" valor={d.cont.aprovado} obs="desde a leitura anterior" />
        </div>

        <div className="linha">
          <GraficoEvolucao historico={d.historico} />
          <PorRelatorio porRelatorio={d.porRelatorio} />
        </div>

        <RankingEmpresas empresas={d.empresas} />

        <ListaPendencias key={grupo || 'todos'} linhas={d.linhas} />
      </main>
    </>
  );
}
