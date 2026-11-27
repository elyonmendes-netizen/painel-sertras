import Link from 'next/link';
import { SITUACOES, contratoCurto, sigla } from '@/lib/status';

const pct = (v, max) => (max > 0 ? (v / max) * 100 : 0) + '%';

export function Legenda({ com = ['pendente', 'analise', 'correcao', 'aprovado'] }) {
  return (
    <div className="legenda">
      {com.map((k) => (
        <span key={k}>
          <span className="quad" style={{ background: SITUACOES[k].barra || SITUACOES[k].cor }} />
          {k === 'aprovado' ? 'Aprovados' : SITUACOES[k].rotulo}
        </span>
      ))}
    </div>
  );
}

// Linha com o total na lista por dia + barrinhas verdes com os aprovados do dia
export function GraficoEvolucao({ historico }) {
  if (!historico?.length) return null;
  const W = 700, H = 220, topo = 24, base = 196;
  const totais = historico.map((d) => d.pendente + d.correcao + d.analise);
  let min = Math.min(...totais), max = Math.max(...totais);
  const folga = Math.max(10, Math.round((max - min) * 0.25));
  min = Math.max(0, min - folga);
  max = max + folga;
  const maxAp = Math.max(1, ...historico.map((d) => d.aprovado));
  const n = historico.length;
  const passo = n > 1 ? (W - 60) / (n - 1) : 0;
  const X = (i) => (n > 1 ? 30 + i * passo : W / 2);
  const Y = (v) => base - ((v - min) / (max - min || 1)) * (base - topo);
  const pontos = totais.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
  const area = n > 1 ? `M${X(0)},${base} L${totais.map((v, i) => `${X(i)},${Y(v)}`).join(' L')} L${X(n - 1)},${base} Z` : '';
  const larg = Math.max(6, Math.min(22, passo * 0.45 || 22));
  const resumo = historico.map((d, i) => `${d.dia}: ${totais[i]} na lista, ${d.aprovado} aprovados`).join('; ');
  const meio = Math.floor((n - 1) / 2);

  return (
    <section className="cartao" style={{ flex: '2 1 560px' }}>
      <div className="cab-secao">
        <h2>Evolução {n > 1 ? `— últimos ${n} dias` : '(cresce a cada dia)'}</h2>
        <div className="legenda">
          <span><span className="quad" style={{ background: '#0F172A' }} />Total na lista</span>
          <span><span className="quad" style={{ background: '#6EE7B7' }} />Aprovados no dia</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220, marginTop: 14 }} role="img" aria-label={resumo}>
        <g stroke="#EEF0F3" strokeWidth="1">
          <line x1="0" y1={topo} x2={W} y2={topo} />
          <line x1="0" y1={(topo + base) / 2} x2={W} y2={(topo + base) / 2} />
          <line x1="0" y1={base} x2={W} y2={base} />
        </g>
        {historico.map((d, i) =>
          d.aprovado > 0 ? (
            <rect key={'b' + i} x={X(i) - larg / 2} y={base - (d.aprovado / maxAp) * 70} width={larg} height={(d.aprovado / maxAp) * 70} rx="4" fill="#A7F3D0">
              <title>{`${d.dia}: ${d.aprovado} aprovados`}</title>
            </rect>
          ) : null
        )}
        {area && <path d={area} fill="#0F172A" fillOpacity="0.05" />}
        {n > 1 && <polyline points={pontos} fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {totais.map((v, i) => (
          <circle key={'c' + i} cx={X(i)} cy={Y(v)} r={i === n - 1 ? 5 : 3} fill="#0F172A" stroke="#fff" strokeWidth="2">
            <title>{`${historico[i].dia}: ${v} na lista`}</title>
          </circle>
        ))}
        <text x={X(n - 1)} y={Y(totais[n - 1]) - 12} textAnchor={n > 1 ? 'end' : 'middle'} fontSize="13" fontWeight="700" fill="#0F172A">{totais[n - 1]}</text>
      </svg>
      <div className="eixo">
        <span>{historico[0].dia}</span>
        {n > 2 && <span>{historico[meio].dia}</span>}
        {n > 1 && <span>{historico[n - 1].dia}</span>}
      </div>
    </section>
  );
}

export function PorRelatorio({ porRelatorio }) {
  const lista = Object.entries(porRelatorio).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...lista.map(([, n]) => n));
  return (
    <section className="cartao" style={{ flex: '1 1 300px' }}>
      <h2 style={{ marginBottom: 8 }}>Por relatório</h2>
      {lista.length === 0 && <p className="cinza">Nada na lista.</p>}
      {lista.map(([r, n]) => (
        <div className="barra-rel" key={r}>
          <div className="barra-rel-cab">
            <span style={{ fontWeight: 600 }}>{r}</span>
            <b>{n}</b>
          </div>
          <div className="trilho"><span style={{ width: pct(n, max) }} /></div>
        </div>
      ))}
    </section>
  );
}

export function RankingEmpresas({ empresas }) {
  const lista = empresas.filter((e) => e.aberto + e.aprovado > 0);
  return (
    <section className="cartao">
      <div className="cab-secao">
        <h2>Ranking de empresas</h2>
        <Legenda com={['pendente', 'analise', 'correcao']} />
      </div>
      {lista.length === 0 && <p className="cinza">Nenhuma pendência.</p>}
      <div className="ranking">
        {lista.map((e) => (
          <Link key={e.contrato_id} href={`/empresa/${e.contrato_id}`} className="empresa-cartao" title={`${e.contrato} · ${e.empresa}`}>
            <span className="sigla">{sigla(e.empresa)}</span>
            <span className="empresa-info">
              <span className="empresa-topo">
                <b>{e.empresa}</b>
                <b>{e.aberto}</b>
              </span>
              <span className="empresa-contrato">
                {contratoCurto(e.contrato)}
                {/^SUB/.test(e.contrato) ? ` · ${e.grupo.replace('-RIO', '')}` : ''}
                {e.aprovado > 0 ? ` · ${e.aprovado} aprovado${e.aprovado > 1 ? 's' : ''}` : ''}
              </span>
              <span className="mini-barra">
                <span style={{ width: pct(e.pendente, e.aberto), background: SITUACOES.pendente.cor }} />
                <span style={{ width: pct(e.analise, e.aberto), background: SITUACOES.analise.barra }} />
                <span style={{ width: pct(e.correcao, e.aberto), background: SITUACOES.correcao.cor }} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
