import { useState, type FormEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Message, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { DraftCard } from '@/components/DraftCard'
import { useChat } from '@/lib/chat-context'

/** Every message is a white bubble with a small tail pointing at whoever sent it. */
const BUBBLE =
  "relative !overflow-visible !rounded-2xl !bg-amber-50 !px-4 !py-2.5 !text-zinc-900 shadow-md before:absolute before:bottom-0 before:h-3 before:w-2.5 before:bg-amber-50 before:content-['']"
const TAIL = {
  assistant: '!rounded-bl-sm before:-left-[7px] before:[clip-path:polygon(100%_0,100%_100%,0_100%)]',
  user: '!rounded-br-sm before:-right-[7px] before:[clip-path:polygon(0_0,100%_100%,0_100%)]',
}

export function Chat() {
  const { messages, busy, error, send, confirm, discard, timezone } = useChat()
  const [text, setText] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setText('')
    send(value)
  }

  return (
    <>
      <img
        src="/aichat.webp"
        alt=""
        className="fixed inset-0 -z-10 size-full scale-105 object-cover object-[50%_60%] blur-[1px]"
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
      <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6rem-10px)] mb-[calc(env(safe-area-inset-bottom)+10px-2.5rem)] flex-col gap-3">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messages.map((m) => (
                  <MessageScrollerItem key={m.id} messageId={String(m.id)} scrollAnchor={m.role === 'user'}>
                    <Message align={m.role === 'user' ? 'end' : 'start'}>
                      <MessageContent>
                        <Bubble
                          variant="ghost"
                          className="max-w-[70%]!"
                          align={m.role === 'user' ? 'end' : 'start'}
                        >
                          <BubbleContent className={`${BUBBLE} ${m.role === 'user' ? TAIL.user : TAIL.assistant}`}>
                            {m.text}
                          </BubbleContent>
                        </Bubble>
                        {m.draft && (
                          <DraftCard
                            draft={m.draft}
                            before={m.edit?.before}
                            timezone={timezone}
                            outcome={m.outcome}
                            busy={busy}
                            onConfirm={() => confirm(m)}
                            onDiscard={() => discard(m.id)}
                          />
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {busy && (
                  <MessageScrollerItem messageId="typing">
                    <Message>
                      <MessageContent>
                        <Bubble variant="ghost" className="max-w-[70%]!">
                          <BubbleContent className={`${BUBBLE} ${TAIL.assistant}`}>
                            Thinking…
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
          </MessageScroller>
        </MessageScrollerProvider>
        {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-red-600 shadow-md">{error}</p>}
        <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-3xl bg-amber-50 p-3 text-zinc-900 shadow-xl">
          <Input
            aria-label="Describe a reminder"
            placeholder="Ask anything… e.g. car insurance renews every 12 March"
            className="h-12 border-0 bg-transparent px-2 text-base text-zinc-900 placeholder:text-amber-900/40 focus-visible:ring-0 dark:bg-transparent"
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="icon" aria-label="Send" disabled={busy || !text.trim()} className="size-10 rounded-full">
              <SendHorizontal />
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
