# RxFx as the "Backend" for Streaming Chat UIs

When people build a chat UI, they usually think first about message bubbles, markdown rendering, and auto-scroll behavior. Those are the visible parts. The harder part is the backend for the component: starting a streamed response, appending chunks in order, exposing loading and active states, canceling a response in progress, and deciding what should happen if the user submits again before the previous answer finishes.

That backend is where chat UIs usually become inconsistent.

This post is about the [`@rxfx/effect`](https://github.com/deanrad/rxfx/tree/main/effect) library — not to be confused with the fine Effect-TS library. RxFx has syntactic and conceptual simplicity as a core value. The point is simple: RxFx can encapsulate a streaming library behind a small concurrency-safe interface, then expose consistent state and lifecycle signals to any UI layer - React, Angular, or anywhere you can pass a callback.

## A streaming chat UI needs more than a stream

A streaming library gives you chunks, which you aggregate into state. That is part of the story, but not all.

A chat component also needs answers to operational questions:

- How do we show loading and in-progress requests?
- How is a request canceled?
- What counts as "loading" before the first token arrives?
- What counts as "active" while tokens are still streaming?
- When are parts of the UI disabled, and are they reliably re-enabled?
- If the user asks a second question mid-stream, do we block it, queue it, cancel the old one, or allow overlap?
- If a request is canceled, how do cancel the underlying stream consumption?
- How do we avoid an older response finishing after a newer one and corrupting the visible transcript?

Those are not presentation concerns. They are effect-management concerns.

RxFx is a good fit because `createEffect` turns an ordinary async function into a cancelable, concurrency-controlled, stateful higher-order function with the same types as the original, but an enhanced return value for notifying subscribers of changes. It exposes lifecycle events, state and activity tracking as part of the effect itself, not throughout UI components.

When a regular async function (Promise, Observable or async iterator) is passed to
In [`createEffect`](https://github.com/deanrad/rxfx/blob/main/effect/src/createEffect.ts), an object is returned that tracks:

- `currentError`
- `lastResponse`
- `state`
- `isHandling`
- `isActive`
- lifecycle streams such as `requests`, `responses`, `starts`, `completions`, and `cancelations`

That means the logic that keeps a chat stream safe is not spread between components, refs, abort controllers, and ad hoc booleans. It is centralized, and free of any coupling to the UI layer.

## The chat-cli example wraps the LLM stream once

The clearest example of how you take an async streaming function, and wrap it in this nice higher-order package is [`./source/effects/chatEffect.ts`](./source/effects/chatEffect.ts). This is the file that wraps the conversational AI streaming interface in this demo repo.

The core move is to wrap the OpenAI streaming client in an `Observable<Chunk>`. Broken down, it is three steps:

1. Start the streaming request inside the Observable constructor.
2. Convert each arriving token chunk into `notify.next(...)`.
3. Return teardown logic that marks the stream canceled so the `for await` loop stops consuming data.

In code:

```ts
function getLLMStream(userMessage: UserMessage): Observable<Chunk> {
  return new Observable((notify) => {
    let canceled = false;

    openai.chat.completions
      .create({
        model: "gpt-4.1",
        messages: [
          ...chatFx.state.value,
          {
            role: "user",
            content: userMessage.content,
          },
        ],
        stream: true,
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          const { delta } = chunk.choices[0];
          if (!delta.content) continue;
          if (canceled) break;

          notify.next({
            requestId: userMessage.id,
            text: delta.content,
          });
        }
        notify.complete();
      })
      .catch((ex) => notify.error(ex.message));

    return () => {
      canceled = true;
    };
  });
}
```

This is the important boundary. The streaming library is self-contained, not a series of React states in each consuming component. A benefit for consistency is that, from React's perspective, every RxFx Effect looks like every other - cancelable (if supported internally), streaming (unless a Promise is returned), concurrency-controllable, and with consumable live-updating properties for React Angular or anywhere you can register a callback.

That gives you a few immediate advantages.

First, cancelation becomes part of the effect API instead of part of the view code. The effect can be canceled with `chatFx.cancelCurrent()`.

Second, the cancelation is not cosmetic. The example explicitly breaks the `for await` loop when canceled so it stops consuming the network response. That avoids the common bug where the UI stops updating but the stream keeps running in the background.

Third, the effect can now participate in rxfx concurrency modes. You are no longer wiring concurrency separately from streaming.

## Concurrency control is the race-condition fix

Chat UIs have a concurrency policy whether you define one or not.

If a user submits twice while a response is in progress, one of several things should happen:

- both should run
- the second should wait
- the first should be canceled
- the second should be ignored

RxFx makes that choice explicit.

In the chat CLI example, the effect is created with `createBlockingEffect`:

```ts
import { createBlockingEffect as createEffect } from "rxfx";
```

That means while one answer is streaming, another request is blocked. For a simple one-box chat UI, that is a reasonable policy. It prevents overlapping assistant replies and avoids transcript corruption without extra code in the component.

If a product wanted a different rule, the code change is small. `effect/src/createEffect.ts` exposes the concurrency variants directly:

- `createEffect` / immediate
- `createQueueingEffect`
- `createSwitchingEffect`
- `createBlockingEffect`
- `createTogglingEffect`

This matters because race conditions in async UI code are often just unnamed concurrency choices. RxFx forces the choice into one line.

## Initial loading and in-progress streaming are different states

Streaming UIs usually need at least two status concepts:

- nothing has arrived yet, so show a loading indicator
- the response is in progress, so show that work is still happening

Those are not identical.

RxFx handles this distinction cleanly in the React adapter. In [`react/src/useService.ts`](https://github.com/deanrad/rxfx/blob/main/react/src/useService.ts), `useService` subscribes to:

- `service.isActive`
- `service.currentError`
- `service.state`
- lifecycle callbacks to derive `isLoading`

`isLoading` is set to `true` on `started`, then cleared on first `next`/`response`, or on finalization. `isActive` remains true for the duration of the request, including streaming after the first chunk arrives.

That is exactly what a chat UI usually needs:

- `isLoading`: no chunks yet
- `isActive`: request still in progress

The chat CLI uses both in [`./source/app.tsx`](./source/app.tsx):

```tsx
const { state: messages, isLoading, isActive, currentError } = useFx(chatFx);

{
  isActive ? (isLoading ? "(Loading) " : "(Working) ") : "";
}
```

This is small, but it removes a common inconsistency. Without a wrapper like this, teams often end up juggling separate booleans such as `loading`, `streaming`, `hasFirstToken`, and `done`, which drift out of sync under cancellation or error conditions.

## The reducer keeps the transcript coherent while streaming

Streaming chat is not only about receiving chunks. It is also about deciding how chunks modify visible state.

The chat example uses `chatFx.reduceWith(...)` to define transcript behavior once:

- on `request`, append the user message and a placeholder assistant message
- on `response`, append chunk text into the correct assistant message
- on `canceled`, annotate the in-progress assistant message

That reducer is also in [`./source/effects/chatEffect.ts`](./source/effects/chatEffect.ts).

This is the other major reason rxfx works well for chat. The stream is not writing directly into component-local state. Instead, lifecycle events are reduced into a coherent state object owned by the effect.

That makes a few failure modes much less likely:

- tokens arriving before a placeholder exists
- an old stream appending into the newest message
- cancellation leaving the UI with no terminal state
- component remounts losing the in-progress transcript logic

## React is just an adapter here

One of the distinct advantages of RxFx, is that none of the streaming logic depends on React.

The chat effect lives outside the component. The reducer lives outside the component. Concurrency and cancelation live outside the component. React only subscribes to the effect's state and status.

That is visible in the thinness of [`@rxfx/react/src/useService.ts`](https://github.com/deanrad/rxfx/blob/main/react/src/useService.ts). The hook does not invent async policy. It just reads an already well-defined effect or service.

That means the same rxfx backend can be used:

- in React
- in another frontend framework
- in a CLI
- in server-side JavaScript or TypeScript
- in tests without a mounted UI

The chat CLI under `assets/_private/chat-cli` demonstrates the point well because it is plainly not a browser chat app, but the same backend concerns still exist there: start a request, stream chunks, expose status, and cancel safely.

## Why this avoids race conditions in practice

There is no magic here. RxFx avoids race conditions by making the async contract explicit and centralized.

The effect defines:

- what a request is
- what a streamed response chunk is
- what cancellation means
- how visible state evolves from lifecycle events
- which concurrency mode applies

Because those concerns live in one unit, the component layer stops improvising them.

The implementation in [`effect/src/createEffect.ts`](https://github.com/deanrad/rxfx/blob/main/effect/src/createEffect.ts) is also doing real work on your behalf:

- `takeUntil(currentCancel)` stops the current observable execution
- `batch.next()` cancels current-and-queued work
- `starts` and `ends` derive `isHandling`
- `isHandling` is transformed into `isActive` so queued transitions do not flicker false between handlings
- `observe(...)` lets adapters derive UI state from lifecycle events without reimplementing the effect

That last point matters. A lot of async UI bugs are not from the stream itself. They come from secondary bookkeeping around the stream. RxFx turns that bookkeeping into library behavior.

## Small integration surface, larger payoff

The case for rxfx in a streaming UI is not that it makes streaming possible. Streaming libraries already do that. The case is that it gives the stream a safe operational container.

In the chat example, the integration surface is small:

1. Wrap the streaming API as an `Observable`.
2. Create an rxfx effect with the desired concurrency mode.
3. Reduce lifecycle events into transcript state.
4. Read `state`, `isLoading`, `isActive`, and `currentError` from the effect.
5. Call `cancelCurrent()` when needed.

That is the entire backend for a robust streaming chat component.

For a visual chat UI, that is the useful way to think about rxfx. It is not just an effect helper. It is the part that makes streaming, cancellation, concurrency control, and status indicators behave consistently together.
