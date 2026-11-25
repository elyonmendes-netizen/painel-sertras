import { NextResponse } from 'next/server';
import { supabaseUsuario } from '@/lib/supabase-server';

export async function GET(request) {
  const db = await supabaseUsuario();
  await db.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}
