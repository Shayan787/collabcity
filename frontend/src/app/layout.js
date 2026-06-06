import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'CollabCity — Find Your People. Get Paid Together.',
  description: 'A hyper-local platform for GenZ to meet cool people, collaborate, and earn money together.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="CollabCity" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181f',
              color: '#e8e8f0',
              border: '1px solid #2a2a35',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}