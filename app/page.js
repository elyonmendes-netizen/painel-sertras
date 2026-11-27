import { carregarBruto } from '@/lib/dados';
import { supabaseUsuario } from '@/lib/supabase-server';
import { GRUPOS } from '@/lib/status';
import Topo from '@/app/componentes/Topo';
import PainelCliente from '@/app/componentes/PainelCliente';

export const dynamic = 'force-dynamic';

export default async function Painel({ searchParams }) {
  const sp = await searchParams;
  const grupo = GRUPOS.includes(sp?.contrato) ? sp.contrato : null;
  const db = await supabaseUsuario();
  const [{ data: { user } }, bruto] = await Promise.all([db.auth.getUser(), carregarBruto()]);

  if (bruto.vazio) {
    return (
      <>
        <Topo email={user?.email} />
        <main className="conteudo">
          <section className="cartao">
            <h1 className="titulo" style={{ fontSize: 24 }}>Ainda não há nenhuma leitura</h1>
            <p className="sub">Assim que o coletor do Chrome rodar pela primeira vez, os dados aparecem aqui.</p>
          </section>
        </main>
      </>
    );
  }

  return <PainelCliente bruto={bruto} grupoInicial={grupo} email={user?.email} />;
}
