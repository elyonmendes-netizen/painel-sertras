'use client';
import { useMemo, useState } from 'react';
import { SITUACOES, RELATORIOS } from '@/lib/status';

// Gera o arquivo do Excel (.csv com ; e acentos) com exatamente o que está filtrado na tela
function baixarExcel(linhas) {
  const esc = (v) => {
    const t = v == null ? '' : String(v);
    return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const cab = ['Contrato', 'Empresa', 'Colaborador', 'Função', 'Documento', 'Competência', 'Relatório', 'Status Sertras', 'Situação', 'Comentário do analista', 'Analista', 'Data do comentário'];
  const corpo = linhas.map((l) => [l.contrato, l.empresa, l.pessoa, l.funcao, l.documento, l.competencia, l.relatorio, l.status, l.detalhe, l.comentario, l.comentario_por, l.comentario_data].map(esc).join(';'));
  const blob = new Blob(['\uFEFF' + [cab.join(';'), ...corpo].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pendencias-sertras-${hoje}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Comentário do analista (Pendente Correção): mostra o começo e abre o resto ao clicar
function Comentario({ l }) {
  const quem = [l.comentario_por, l.comentario_data].filter(Boolean).join(' · ');
  const longo = l.comentario.length > 180;
  return (
    <div className="comentario-analista">
      <div className="comentario-quem">Comentário do analista{quem ? ` (${quem})` : ''}</div>
      {longo ? (
        <details>
          <summary>{l.comentario.slice(0, 160).trim()}… <span className="ver-mais">ver tudo</span></summary>
          <div className="comentario-texto">{l.comentario}</div>
        </details>
      ) : (
        <div className="comentario-texto">{l.comentario}</div>
      )}
    </div>
  );
}

export default function ListaPendencias({ linhas, mostrarEmpresa = true }) {
  const [busca, setBusca] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [situacao, setSituacao] = useState('todos');
  const [relatorio, setRelatorio] = useState('');
  const [limite, setLimite] = useState(100);

  // Empresas que aparecem na lista, em ordem de contrato
  const empresas = useMemo(() => {
    const m = new Map();
    for (const l of linhas) if (!m.has(l.contrato_id)) m.set(l.contrato_id, { id: l.contrato_id, contrato: l.contrato, empresa: l.empresa, n: 0 });
    for (const l of linhas) m.get(l.contrato_id).n++;
    return [...m.values()].sort((a, b) => a.contrato.localeCompare(b.contrato, 'pt-BR', { numeric: true }));
  }, [linhas]);
  const empresaValida = empresa && empresas.some((e) => String(e.id) === empresa) ? empresa : '';

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (empresaValida && String(l.contrato_id) !== empresaValida) return false;
      if (situacao !== 'todos' && l.situacao !== situacao) return false;
      if (relatorio && l.relatorio !== relatorio) return false;
      if (b && ![l.contrato, l.empresa, l.pessoa, l.funcao, l.documento, l.competencia, l.comentario].some((x) => (x || '').toLowerCase().includes(b))) return false;
      return true;
    });
  }, [linhas, busca, empresaValida, situacao, relatorio]);

  return (
    <section className="cartao">
      <div className="cab-secao" style={{ alignItems: 'center' }}>
        <h2>Lista <span style={{ color: '#94A3B8', fontWeight: 600 }}>{filtradas.length}</span></h2>
        <div className="filtros">
          <label className="campo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, documento, SUB ou comentário" aria-label="Buscar" />
          </label>
          {mostrarEmpresa && (
            <select className="campo" value={empresaValida} onChange={(e) => { setEmpresa(e.target.value); setLimite(100); }} aria-label="Empresa" style={{ maxWidth: 320 }}>
              <option value="">Todas as empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.contrato.replace(/ - \d{3}\/\d{4}-RIO.*/, '')} · {e.empresa} ({e.n})
                </option>
              ))}
            </select>
          )}
          <select className="campo" value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Situação">
            <option value="todos">Todas as situações</option>
            <option value="pendente">Pendente (não anexado)</option>
            <option value="analise">Pendente Sertras (aguardando análise)</option>
            <option value="correcao">Pendente Correção</option>
            <option value="aprovado">Aprovados</option>
          </select>
          <select className="campo" value={relatorio} onChange={(e) => setRelatorio(e.target.value)} aria-label="Relatório">
            <option value="">Todos os relatórios</option>
            {RELATORIOS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button type="button" className="botao" onClick={() => baixarExcel(filtradas)} disabled={filtradas.length === 0}>Baixar Excel</button>
        </div>
      </div>
      <div className="tabela-caixa">
        <table>
          <thead>
            <tr>
              {mostrarEmpresa && <th>Empresa</th>}
              <th>Colaborador</th>
              <th>Documento</th>
              <th>Competência</th>
              <th>Relatório</th>
              <th>Status</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.slice(0, limite).map((l) => {
              const s = SITUACOES[l.situacao];
              return (
                <tr key={l.id}>
                  {mostrarEmpresa && (
                    <td>
                      <b>{l.contrato}</b>
                      <div className="sub-linha">{l.empresa}</div>
                    </td>
                  )}
                  <td>
                    {l.pessoa || '—'}
                    {l.funcao && <div className="sub-linha">{l.funcao}</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {l.documento}
                    {l.comentario && <Comentario l={l} />}
                  </td>
                  <td>{l.competencia || '—'}</td>
                  <td className="cinza">{l.relatorio}</td>
                  <td>
                    <span className="etq" style={{ background: s.fundo, color: s.texto }}><i style={{ background: s.cor }} />{l.status}</span>
                  </td>
                  <td className="cinza" style={{ fontSize: 12.5 }}>{l.detalhe}</td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="cinza">Nada encontrado com esses filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtradas.length > limite && (
        <p style={{ textAlign: 'center' }}>
          <button className="botao claro" onClick={() => setLimite(limite + 200)}>Mostrar mais ({filtradas.length - limite} restantes)</button>
        </p>
      )}
    </section>
  );
}
