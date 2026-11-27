'use client';
import { useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-browser';
import Logo from '@/app/componentes/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro('E-mail ou senha incorretos.');
      setCarregando(false);
      return;
    }
    window.location.href = '/';
  }

  return (
    <div className="login-tela">
      <div className="login-lado">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo />
          <div className="marca-nome" style={{ fontSize: 20 }}>Pendências Sertras</div>
        </div>
        <div>
          <div className="titulo" style={{ fontSize: 34, lineHeight: 1.15 }}>Toda a documentação de terceiros do consórcio em um só lugar.</div>
          <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.6, color: '#CBD5E1' }}>Contratos 128/2024, 063/2026 e 058/2026. Atualizado todo dia às 07:45.</p>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>Consórcio CTS · Segurança do Trabalho</div>
      </div>
      <div className="login-form-lado">
        <form className="login-form" onSubmit={entrar}>
          <h1 className="titulo" style={{ fontSize: 24 }}>Entrar</h1>
          <p className="sub" style={{ marginTop: -8 }}>Acesso restrito a usuários convidados.</p>
          {erro && <div className="erro">{erro}</div>}
          <label>
            E-mail
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" />
          </label>
          <label>
            Senha
            <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          <button type="submit" disabled={carregando}>{carregando ? 'Entrando…' : 'Entrar'}</button>
          <p className="cinza" style={{ fontSize: 13, textAlign: 'center', margin: 0 }}>Esqueceu a senha? Fale com o responsável pelo painel.</p>
        </form>
      </div>
    </div>
  );
}
