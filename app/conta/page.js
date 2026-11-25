'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseNavegador } from '@/lib/supabase-browser';

export default function Conta() {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [msg, setMsg] = useState(null);

  async function salvar(e) {
    e.preventDefault();
    if (s1.length < 8) return setMsg({ erro: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (s1 !== s2) return setMsg({ erro: 'As duas senhas não são iguais.' });
    const { error } = await supabaseNavegador().auth.updateUser({ password: s1 });
    if (error) return setMsg({ erro: 'Não foi possível trocar a senha: ' + error.message });
    setS1('');
    setS2('');
    setMsg({ ok: 'Senha trocada com sucesso.' });
  }

  return (
    <div className="login-form-lado" style={{ minHeight: '100vh' }}>
      <form className="login-form" onSubmit={salvar}>
        <Link href="/" style={{ fontSize: 14, textDecoration: 'none' }}>← Voltar ao painel</Link>
        <h1 className="titulo" style={{ fontSize: 24 }}>Trocar senha</h1>
        {msg?.erro && <div className="erro">{msg.erro}</div>}
        {msg?.ok && <div className="ok">{msg.ok}</div>}
        <label>
          Nova senha
          <input type="password" autoComplete="new-password" value={s1} onChange={(e) => setS1(e.target.value)} required />
        </label>
        <label>
          Repita a nova senha
          <input type="password" autoComplete="new-password" value={s2} onChange={(e) => setS2(e.target.value)} required />
        </label>
        <button type="submit">Salvar nova senha</button>
      </form>
    </div>
  );
}
