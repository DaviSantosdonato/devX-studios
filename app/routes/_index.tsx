import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';

export const meta: MetaFunction = () => {
  return [
    { title: 'DevX Studio — Build software with AI' },
    {
      name: 'description',
      content: 'Describe your idea and build working full-stack software with AI in DevX Studio.',
    },
  ];
};

export const loader = () => json({});

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <main className="flex min-h-0 flex-1" aria-label="DevX Studio workspace">
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </main>
    </div>
  );
}
