'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAT_LIMIT, type ChatMessage } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatBox({ userId }: { userId: string }) {
  const socket = useSocket((s) => s.socket);
  const messages = useSocket((s) => s.messages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!socket) return;

    const text = draft.trim();
    if (!text) return;

    socket.emit('chat:send', text, (res) => {
      if (res.ok) {
        setDraft('');
        setError('');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex h-72 flex-col rounded-lg border border-border">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">Say hello to the room.</p>
        )}

        {messages.map((message: ChatMessage) =>
          message.system ? (
            <p key={message.id} className="text-center text-xs italic text-muted-foreground">
              {message.text}
            </p>
          ) : (
            <div key={message.id} className="text-sm">
              <span
                className={
                  message.userId === userId
                    ? 'font-medium text-primary'
                    : 'font-medium text-foreground'
                }
              >
                {message.name}
              </span>{' '}
              <span className="text-muted-foreground">{message.text}</span>
              {message.flagged && message.userId === userId && (
                <span className="ml-1 text-xs text-amber-500">(filtered)</span>
              )}
            </div>
          ),
        )}

        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CHAT_LIMIT}
          placeholder="Message"
        />
        <Button type="submit" size="sm" variant="outline">
          Send
        </Button>
      </form>

      {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
