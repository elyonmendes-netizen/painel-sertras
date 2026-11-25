'use client';
import { useMemo, useState } from 'react';
import { SITUACOES, RELATORIOS } from '@/lib/status';

export default function ListaPendencias({ linhas, linkExportar, mostrarEmpresa = true }) {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('todos');
  const [relatorio, setRelatorio] = useState('');
  const [limite, setLimite] = useState(100);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (situacao !== 'todos' && l.situacao !== situacao) return false;
      if (relatorio && l.relatorio !== relatorio) return false;
      if (b && ![l.contrato, l.empresa, l.pessoa, l.funcao, l.documento, l.competencia].some((x) => (x || '').toLowerCase().includes(b))) return false;
      return true;
    });
  }, [linhas, busca, situacao, relatorio]);

  return (
    <section className="cartao">
      <div className="cab-secao" style={{ alignItems: 'center' }}>
        <h2>Lista ({filtradas.length})</h2>
        <div className="filtros">
          <label className="campo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, documento ou SUB" aria-label="Buscar" />
          </label>
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
          <a className="botao" href={linkExportar}>Baixar Excel</a>
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
                      <div className="cinza" style={{ fontSize: 12 }}>{l.empresa}</div>
                    </td>
                  )}
                  <td>
                    {l.pessoa || '—'}
                    {l.funcao && <div className="cinza" style={{ fontSize: 12 }}>{l.funcao}</div>}
                  </td>
                  <td>{l.documento}</td>
                  <td>{l.competencia || '—'}</td>
                  <td className="cinza">{l.relatorio}</td>
                  <td>
                    <span className="etq" style={{ background: s.fundo, color: s.texto }}>{l.status}</span>
                  </td>
                  <td className="cinza" style={{ fontSize: 13 }}>{l.detalhe}</td>
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
          <button className="botao" onClick={() => setLimite(limite + 200)}>Mostrar mais ({filtradas.length - limite} restantes)</button>
        </p>
      )}
    </section>
  );
}
