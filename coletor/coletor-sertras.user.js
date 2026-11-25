// ==UserScript==
// @name         Coletor de Pendências Sertras
// @namespace    painel-sertras
// @version      1.2
// @description  Uma vez por dia lê as pendências de todos os contratos do Sertras e envia para o Painel de Pendências.
// @match        https://gestaodeterceiros.sertras.com/escolha-um-contrato*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      painel-sertras.vercel.app
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ===================== CONFIGURAÇÃO (preencha as 2 linhas) =====================
  const ENDERECO_PAINEL = 'https://painel-sertras.vercel.app'; // sem barra no final
  const INGEST_TOKEN = 'COLE-AQUI-O-MESMO-INGEST_TOKEN-DO-VERCEL';
  // ===============================================================================

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window; // janela da página (Alpine, BASEURL)
  const STATUS = '0,4,5,6'; // Pendente, Pendente Sertras, Pendente Correção, Pendente Sertras Correção
  const RELATORIOS = {
    'recurso-acompanhar-documentos-pessoas': 'Mensal Pessoas',
    'recurso-acompanhar-documentos-empresas': 'Mensal Empresa',
    'recurso-integracao-documentos-pessoas': 'Integração Pessoas',
    'recurso-integracao-documentos-empresas': 'Integração Empresa',
  };

  const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
        headers: { 'content-type': 'application/json', 'x-ingest-token': INGEST_TOKEN },
        data: JSON.stringify(dados),
        timeout: 60000,
        onload: (r) => {
          let j = {};
          try { j = JSON.parse(r.responseText); } catch (e) {}
          if (r.status === 200 && j.ok) ok(j);
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
    return itens.map((o) => ({ id: String(o.ContratoTerceiroID), num: o.con_ter_num, emp: o.emp_ter_raz_soc, ativo: o.statusContrato != 0 }));
  }

  let rodando = false;
  async function coletar() {
    if (rodando) return;
    rodando = true;
    botao.disabled = true;
    try {
      if (INGEST_TOKEN.startsWith('COLE-AQUI')) {
        throw new Error('cole o INGEST_TOKEN no início do script (Tampermonkey > editar)');
      }
      const BASE = W.BASEURL || location.origin + '/';
      const lista = listaDeContratos().filter((c) => c.ativo);
      if (!lista.length) throw new Error('não achei a lista de contratos (você está logado?)');

      const itens = [];
      const erros = [];
      const lidos = [];
      for (let n = 0; n < lista.length; n++) {
        const c = lista[n];
        mostra(`Lendo ${n + 1} de ${lista.length}: ${c.num}<br><span style="color:#FDE68A">Não use o Sertras em outra aba até terminar.</span>`, 'rodando');
        const fd = new URLSearchParams();
        fd.set('ContratoTerceiroId', c.id);
        const resp = (await (await fetch(BASE + 'ajax/ajx_PerfilMudaContrato.php', { method: 'POST', body: fd, credentials: 'include' })).text()).trim();
        if (resp.split('|')[0] !== 'OK') { erros.push(`${c.num}: não abriu (${resp.split('|')[0]})`); continue; }

        let falhou = false;
        const doContrato = [];
        for (const [caminho, nome] of Object.entries(RELATORIOS)) {
          let pagina = 1, ultima = 1;
          do {
            const html = await (await fetch(`/${caminho}/?pagina=${pagina}&filtro_status=${STATUS}&filtro_status_recurso=1`, { credentials: 'include' })).text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const tabela = doc.querySelector('#data-tables2');
            if (!tabela) { erros.push(`${c.num}: ${nome} não carregou`); falhou = true; break; }
            const cab = [...tabela.querySelectorAll('thead th')].map((th) => th.innerText.trim());
            const col = (k) => cab.indexOf(k);
            for (const tr of tabela.querySelectorAll('tbody tr')) {
              const td = [...tr.children].map((x) => limpa(x.innerText));
              if (td.length < cab.length) continue;
              const v = (k) => (col(k) >= 0 ? td[col(k)] : null);
              doContrato.push({
                contrato_id: c.id, contrato: c.num, empresa: c.emp, relatorio: nome,
                pessoa: v('Nome'), funcao: v('Função'), evento: v('Evento'), documento: v('Documento'),
                competencia: v('Competência'), data_envio: v('Data Envio'), status: v('Status'), sla: v('Prazo SLA'),
              });
            }
            const paginas = [...doc.querySelectorAll('.pagination a')]
              .map((a) => +new URL(a.getAttribute('href'), location.origin).searchParams.get('pagina'))
              .filter(Boolean);
            ultima = Math.max(1, ...paginas);
            pagina++;
            await sleep(300);
          } while (pagina <= ultima);
        }
        itens.push(...doContrato);
        if (!falhou) lidos.push(c.id); // só marca como lido se os 4 relatórios vieram
      }

      mostra('Enviando para o painel…', 'rodando');
      const r = await enviar({ itens, erros, contratosLidos: lidos });
      GM_setValue('ultimaColeta', hoje());
      mostra(`Coleta de hoje concluída: ${r.itens} itens na lista, ${r.aprovados} aprovados.${erros.length ? '<br>Avisos: ' + erros.length : ''}<br>Agora escolha o contrato em que vai trabalhar.`, 'ok');
    } catch (e) {
      mostra('Erro na coleta: ' + e.message, 'erro');
    } finally {
      rodando = false;
      botao.disabled = false;
    }
  }

  botao.addEventListener('click', coletar);

  // Roda sozinho 1 vez por dia, na primeira vez que esta página abre
  setTimeout(() => {
    if (GM_getValue('ultimaColeta') === hoje()) {
      mostra('Coleta de hoje já foi feita.', 'ok');
    } else {
      coletar();
    }
  }, 2000);
})();
