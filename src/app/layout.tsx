import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'stream-chat-react/dist/css/v2/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Innov8IT Workspace',
  description: 'A focused workspace for teams that want to do big things.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="text-white bg-purple antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
