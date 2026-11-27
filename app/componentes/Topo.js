import Link from 'next/link';
import { fmtDataHora } from '@/lib/formato';
import Logo from '@/app/componentes/Logo';

// Barra do topo. "centro" recebe o seletor de contrato na página principal.
export default function Topo({ email, atualizadoEm, temErros, centro = null }) {
  const horas = atualizadoEm ? (Date.now() - new Date(atualizadoEm).getTime()) / 36e5 : null;
  const atrasado = horas == null || horas > 30;
  const iniciais = (email || '?').slice(0, 2).toUpperCase();
  let textoHora = 'Ainda sem leitura';
  if (atualizadoEm) {
    textoHora = `Atualizado ${fmtDataHora(atualizadoEm)}`;
    if (atrasado) textoHora += ' · atrasado';
    else if (temErros) textoHora += ' · com avisos';
  }
  return (
    <header className="topo">
      <Link href="/" className="marca">
        <Logo />
        <div>
          <div className="marca-nome">Pendências Sertras</div>
          <div className="marca-sub">Consórcio CTS · ETE São Gonçalo</div>
        </div>
      </Link>
      {centro}
      <div className="topo-dir">
        <span className={'selo-hora' + (atrasado || temErros ? ' alerta' : '')}>
          <span className="ponto" />
          {textoHora}
        </span>
        <Link href="/conta">Trocar senha</Link>
        <a href="/sair">Sair</a>
        <span className="avatar" title={email}>{iniciais}</span>
      </div>
    </header>
  );
}
