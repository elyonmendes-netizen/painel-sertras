import './globals.css';

export const metadata = {
  title: 'Pendências Sertras',
  description: 'Painel de pendências do Sertras — Consórcio CTS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
