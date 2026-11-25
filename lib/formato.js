const TZ = 'America/Sao_Paulo';
export const fmtDataHora = (iso) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—';
export const fmtDia = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));
export const chaveDia = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));

export function diasDesde(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5));
}


