// ==UserScript==
// @name         Coletor de Pendências Sertras
// @namespace    painel-sertras
// @version      2.1
// @description  Uma vez por dia lê as pendências de todos os contratos do Sertras e envia para o Painel de Pendências.
// @match        https://gestaodeterceiros.sertras.com/escolha-um-contrato*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      painel-sertras.vercel.app
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/elyonmendes-netizen/painel-sertras/main/coletor/coletor-sertras.user.js
// @downloadURL  https://raw.githubusercontent.com/elyonmendes-netizen/painel-sertras/main/coletor/coletor-sertras.user.js
// ==/UserScript==

(function () {
  'use strict';

  const ENDERECO_PAINEL = 'https://painel-sertras.vercel.app';
  // O token NÃO fica no código: na 1ª vez o script pede e guarda no Tampermonkey.
  // Assim as atualizações automáticas do script não apagam o token.
  function pegarToken(forcar) {
    let t = forcar ? '' : GM_getValue('ingestToken', '');
    if (!t) {
      t = (window.prompt('Painel de Pendências: cole aqui o INGEST_TOKEN (o mesmo do Vercel)') || '').trim();
      if (t) GM_setValue('ingestToken', t);
    }
    return t;
  }

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window; // janela da página (Alpine, BASEURL)
  const STATUS = '0,4,5,6'; // Pendente, Pendente Sertras, Pendente Correção, Pendente Sertras Correção
  const RELATORIOS = {
    'recurso-acompanhar-documentos-pessoas': 'Mensal Pessoas',
    'recurso-acompanhar-documentos-empresas': 'Mensal Empresa',
    'recurso-integracao-documentos-pessoas': 'Integração Pessoas',
    'recurso-integracao-documentos-empresas': 'Integração Empresa',
  };

  const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const limpa = (s) => (s || '').replace(/\bbaixar( anexo)?\b/g, '').replace(/\s+/g, ' ').trim();

  // ---------- Caixinha de status no canto da tela ----------
  const caixa = document.createElement('div');
  caixa.id = 'coletor-sertras';
  caixa.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#0F172A;color:#fff;font:13px system-ui,sans-serif;padding:12px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:340px;line-height:1.45';
  const texto = document.createElement('div');
  const botao = document.createElement('button');
  botao.textContent = 'Coletar agora';
  botao.style.cssText = 'margin-top:8px;background:#F59E0B;color:#0F172A;border:0;border-radius:6px;padding:6px 10px;font-weight:600;cursor:pointer';
  caixa.append(texto, botao);
  document.body.appendChild(caixa);
  const mostra = (msg, estado) => {
    texto.innerHTML = '<b>Painel de Pendências</b><br>' + msg;
    caixa.dataset.estado = estado || '';
  };

  function enviar(dados) {
    return new Promise((ok, falha) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: ENDERECO_PAINEL + '/api/ingest',
        headers: { 'content-type': 'application/json', 'x-ingest-token': pegarToken(false) },
        data: JSON.stringify(dados),
        timeout: 60000,
        onload: (r) => {
          let j = {};
          try { j = JSON.parse(r.responseText); } catch (e) {}
          if (r.status === 200 && j.ok) ok(j);
          else if (r.status === 401) { GM_setValue('ingestToken', ''); falha(new Error('token recusado pelo painel — clique em Coletar agora e cole o token de novo')); }
          else falha(new Error(j.erro || 'resposta ' + r.status));
        },
        onerror: () => falha(new Error('sem conexão com o painel')),
        ontimeout: () => falha(new Error('o painel demorou demais para responder')),
      });
    });
  }

  function listaDeContratos() {
    const el = document.querySelector('[x-data]');
    const d = W.Alpine && el ? W.Alpine.$data(el) : null;
    const itens = (d && (d.items || d.contratos)) || [];
    return itens.map((o) => ({ id: String(o.ContratoTerceiroID), num: o.con_ter_num, emp: o.emp_ter_raz_soc, cnpj: String(o.emp_ter_cnpj || '').replace(/\D/g, ''), ativo: o.statusContrato != 0 }));
  }

  // Descobre em qual contrato a sessão está agora (para voltar a ele no final)
  async function contratoAtivo(BASE, lista) {
    try {
      const html = await (await fetch(BASE + 'dashboard/', { credentials: 'include' })).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rotulo = doc.querySelector('.gt-contract-label');
      if (!rotulo) return null;
      const partes = rotulo.textContent.split('|').map((x) => x.trim());
      const num = partes[0];
      const cnpj = (partes[1] || '').replace(/\D/g, '');
      const candidatos = lista.filter((c) => c.num === num);
      return candidatos.length === 1 ? candidatos[0] : candidatos.find((c) => (c.cnpj || '') === cnpj) || null;
    } catch (e) {
      return null;
    }
  }

  async function trocarPara(BASE, c) {
    const fd = new URLSearchParams();
    fd.set('ContratoTerceiroId', c.id);
    return (await (await fetch(BASE + 'ajax/ajx_PerfilMudaContrato.php', { method: 'POST', body: fd, credentials: 'include' })).text()).trim();
  }

  let rodando = false;
  async function coletar() {
    if (rodando) return;
    rodando = true;
    botao.disabled = true;
    let original = null;
    let restaurado = false;
    const BASE = W.BASEURL || location.origin + '/';
    try {
      if (!pegarToken(false)) throw new Error('sem token: clique em Coletar agora e cole o INGEST_TOKEN');
      const todosContratos = listaDeContratos();
      const lista = todosContratos.filter((c) => c.ativo);
      if (!lista.length) throw new Error('não achei a lista de contratos (você está logado?)');
      original = await contratoAtivo(BASE, todosContratos);

      const itens = [];
      const erros = [];
      const lidos = [];
      for (let n = 0; n < lista.length; n++) {
        const c = lista[n];
        mostra(`Lendo ${n + 1} de ${lista.length}: ${c.num}<br><span style="color:#FDE68A">Não use o Sertras em outra aba até terminar.</span>`, 'rodando');
        const resp = await trocarPara(BASE, c);
        if (resp.split('|')[0] !== 'OK') { erros.push(`${c.num}: não abriu (${resp.split('|')[0]})`); continue; }

        // Os 4 relatórios do contrato são lidos ao mesmo tempo (a troca de contrato continua em sequência)
        const lerPagina = async (caminho, pagina) => {
          const html = await (await fetch(`/${caminho}/?pagina=${pagina}&filtro_status=${STATUS}&filtro_status_recurso=1`, { credentials: 'include' })).text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const tabela = doc.querySelector('#data-tables2');
          if (!tabela) return null;
          const ultima = Math.max(1, ...[...doc.querySelectorAll('.pagination a')]
            .map((a) => +new URL(a.getAttribute('href'), location.origin).searchParams.get('pagina'))
            .filter(Boolean));
          return { tabela, ultima };
        };
        const extrair = (tabela, nome) => {
          const cab = [...tabela.querySelectorAll('thead th')].map((th) => th.innerText.trim());
          const col = (k) => cab.indexOf(k);
          const out = [];
          for (const tr of tabela.querySelectorAll('tbody tr')) {
            const td = [...tr.children].map((x) => limpa(x.innerText));
            if (td.length < cab.length) continue;
            const v = (k) => (col(k) >= 0 ? td[col(k)] : null);
            out.push({
              contrato_id: c.id, contrato: c.num, empresa: c.emp, relatorio: nome,
              pessoa: v('Nome'), funcao: v('Função'), evento: v('Evento'), documento: v('Documento'),
              competencia: v('Competência'), data_envio: v('Data Envio'), status: v('Status'), sla: v('Prazo SLA'),
            });
          }
          return out;
        };
        const resultados = await Promise.all(Object.entries(RELATORIOS).map(async ([caminho, nome]) => {
          const p1 = await lerPagina(caminho, 1);
          if (!p1) return { nome, erro: true, linhas: [] };
          let linhas = extrair(p1.tabela, nome);
          if (p1.ultima > 1) {
            const resto = await Promise.all(Array.from({ length: p1.ultima - 1 }, (_, i) => lerPagina(caminho, i + 2)));
            if (resto.some((x) => !x)) return { nome, erro: true, linhas: [] };
            for (const pg of resto) linhas = linhas.concat(extrair(pg.tabela, nome));
          }
          return { nome, erro: false, linhas };
        }));
        let falhou = false;
        const doContrato = [];
        for (const r of resultados) {
          if (r.erro) { erros.push(`${c.num}: ${r.nome} não carregou`); falhou = true; }
          else doContrato.push(...r.linhas);
        }
        itens.push(...doContrato);
        if (!falhou) lidos.push(c.id); // só marca como lido se os 4 relatórios vieram
      }

      // Volta para o contrato em que a pessoa estava antes da coleta
      let voltou = '';
      if (original) {
        const v = await trocarPara(BASE, original);
        restaurado = v.split('|')[0] === 'OK';
        voltou = v.split('|')[0] === 'OK' ? `Voltei para o contrato em que você estava: <b>${original.num}</b>.` : 'Não consegui voltar ao contrato anterior: escolha o contrato antes de enviar documentos.';
      } else {
        voltou = 'Agora escolha o contrato em que vai trabalhar.';
      }

      mostra('Enviando para o painel…', 'rodando');
      const r = await enviar({ itens, erros, contratosLidos: lidos });
      GM_setValue('ultimaColeta', hoje());
      mostra(`Coleta de hoje concluída: ${r.itens} itens na lista, ${r.aprovados} aprovados.${erros.length ? '<br>Avisos: ' + erros.length : ''}<br>${voltou}`, 'ok');
    } catch (e) {
      if (original && !restaurado) { try { await trocarPara(BASE, original); } catch (e2) {} }
      mostra('Erro na coleta: ' + e.message, 'erro');
    } finally {
      rodando = false;
      botao.disabled = false;
    }
  }

  botao.addEventListener('click', coletar);
  const trocar = document.createElement('a');
  trocar.textContent = 'trocar token';
  trocar.href = '#';
  trocar.style.cssText = 'margin-left:10px;color:#CBD5E1;font-size:12px';
  trocar.addEventListener('click', (e) => { e.preventDefault(); if (pegarToken(true)) mostra('Token salvo.', 'ok'); });
  caixa.appendChild(trocar);

  // Roda sozinho 1 vez por dia, na primeira vez que esta página abre
  setTimeout(() => {
    if (GM_getValue('ultimaColeta') === hoje()) {
      mostra('Coleta de hoje já foi feita.', 'ok');
    } else {
      coletar();
    }
  }, 2000);
})();
