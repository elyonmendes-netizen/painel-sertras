import Link from 'next/link';
import { fmtDataHora } from '@/lib/formato';
import Logo from '@/app/componentes/Logo';

export default function Topo({ email, atualizadoEm, temErros }) {
  const horas = atualizadoEm ? (Date.now() - new Date(atualizadoEm).getTime()) / 36e5 : null;
  const atrasado = horas == null || horas > 30;
  const iniciais = (email || '?').slice(0, 2).toUpperCase();
  return (
    <header className="topo">
      <Link href="/" className="marca">
        <Logo />
        <div>
          <div className="titulo" style={{ fontWeight: 700, fontSize: 18 }}>Pendências Sertras</div>
          <div style={{ fontSize: 12, color: '#CBD5E1' }}>Consórcio CTS · ETE São Gonçalo</div>
        </div>
      </Link>
      <div className="topo-dir">
        <span>
          <span className={'ponto' + (atrasado || temErros ? ' alerta' : '')} />
          {atualizadoEm ? `Atualizado em ${fmtDataHora(atualizadoEm)}` : 'Ainda sem leitura'}
          {atrasado && atualizadoEm ? ' · leitura atrasada' : ''}
          {temErros ? ' · leitura com avisos' : ''}
        </span>
        <span className="usuario">
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: '#fff' }}>{iniciais}</span>
          {email}
        </span>
        <Link href="/conta">Trocar senha</Link>
        <a href="/sair">Sair</a>
      </div>
    </header>
  );
}
