import Link from 'next/link';
import { SITUACOES } from '@/lib/status';

const pct = (v, max) => (max > 0 ? (v / max) * 100 : 0) + '%';

export function Legenda({ com = ['pendente', 'analise', 'correcao', 'aprovado'] }) {
  return (
    <div className="legenda">
      {com.map((k) => (
        <span key={k}>
          <span className="quad" style={{ background: SITUACOES[k].cor }} />
          {k === 'aprovado' ? 'Aprovados' : SITUACOES[k].rotulo}
        </span>
      ))}
    </div>
  );
}

export function GraficoEvolucao({ historico }) {
  if (!historico?.length) return null;
  const max = Math.max(1, ...historico.map((d) => d.pendente + d.correcao + d.analise));
  const maxAp = Math.max(1, ...historico.map((d) => d.aprovado));
  const resumo = historico.map((d) => `${d.dia}: ${d.pendente + d.correcao + d.analise} na lista, ${d.aprovado} aprovados`).join('; ');
  return (
    <section className="cartao">
      <div className="cab-secao">
        <h2>Evolução {historico.length > 1 ? `dos últimos ${historico.length} dias` : '(o gráfico cresce a cada dia)'}</h2>
        <Legenda />
      </div>
      <div className="grafico" role="img" aria-label={resumo}>
        {historico.map((d) => (
          <div className="dia" key={d.dia} title={`${d.dia} — Pendente ${d.pendente} · Pendente Sertras ${d.analise} · Pendente Correção ${d.correcao} · Aprovados ${d.aprovado}`}>
            <div className="pilha">
              <span style={{ height: pct(d.correcao, max), background: SITUACOES.correcao.cor, borderRadius: '3px 3px 0 0' }} />
              <span style={{ height: pct(d.analise, max), background: SITUACOES.analise.cor }} />
              <span style={{ height: pct(d.pendente, max), background: SITUACOES.pendente.cor }} />
            </div>
            <span style={{ flex: 1, height: `calc(${pct(d.aprovado, maxAp)} * 0.6)`, background: SITUACOES.aprovado.cor, borderRadius: '3px 3px 0 0' }} />
          </div>
        ))}
      </div>
      <div className="rotulos">
        {historico.map((d) => (
          <span key={d.dia}>{d.dia}</span>
        ))}
      </div>
      <p className="nota">Barra da esquerda: tudo que está na lista em cada dia. Barra verde: aprovados naquele dia (escala própria).</p>
    </section>
  );
}

export function BarrasEmpresas({ empresas }) {
  const lista = empresas.filter((e) => e.aberto + e.aprovado > 0);
  const max = Math.max(1, ...lista.map((e) => e.aberto));
  return (
    <section className="cartao col-larga">
      <div className="cab-secao">
        <h2>Pendências por empresa</h2>
        <Legenda com={['pendente', 'analise', 'correcao']} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
        {lista.length === 0 && <p className="cinza">Nenhuma pendência.</p>}
        {lista.map((e) => (
          <Link key={e.contrato_id} href={`/empresa/${e.contrato_id}`} className="barra-linha" title={`${e.contrato} · ${e.empresa}`}>
            <span className="barra-nome">
              <b>{e.contrato.replace(/ - \d{3}\/\d{4}-RIO.*/, '')}</b> · {e.empresa}
            </span>
            <span className="barra">
              <span style={{ width: pct(e.pendente, max), background: SITUACOES.pendente.cor }} />
              <span style={{ width: pct(e.analise, max), background: SITUACOES.analise.cor }} />
              <span style={{ width: pct(e.correcao, max), background: SITUACOES.correcao.cor }} />
            </span>
            <span className="barra-total">{e.aberto}</span>
          </Link>
        ))}
      </div>
      <p className="nota">Clique numa empresa para ver o detalhe.</p>
    </section>
  );
}
