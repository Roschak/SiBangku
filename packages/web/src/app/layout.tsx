import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiBangku',
  description: 'Restaurant Reservation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const controlApiUrl = process.env.NEXT_PUBLIC_CONTROL_API_URL || 'http://localhost:3001';
  const tenantApiUrl = process.env.NEXT_PUBLIC_TENANT_API_URL || 'http://localhost:3002';

  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalFetch = window.fetch;
                const CONTROL_API_URL = ${JSON.stringify(controlApiUrl)};
                const TENANT_API_URL = ${JSON.stringify(tenantApiUrl)};
                window.fetch = function(input, init) {
                  if (typeof input === 'string') {
                    if (input.startsWith('http://localhost:3001')) {
                      input = input.replace('http://localhost:3001', CONTROL_API_URL);
                    } else if (input.startsWith('http://localhost:3002')) {
                      input = input.replace('http://localhost:3002', TENANT_API_URL);
                    }
                  }
                  return originalFetch(input, init);
                };
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

