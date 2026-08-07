import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DesignLens — Visual Design Comparison',
  description:
    'Compare UI/UX designs against developer implementations. Find visual discrepancies across viewports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
