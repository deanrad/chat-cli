// @ts-nocheck
import {
  createImmediateEffect as createEffect,
  Observable,
  concatMap,
  after,
  THRESHOLD,
  randomizePreservingAverage,
} from "rxfx";
import { interval } from "rxjs";
import { take, map } from "rxjs/operators";

import OpenAI from "openai";
import { produce } from "immer";

// #region Types
export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}
export interface UserMessage extends Message {
  role: "user";
}
export interface AssistantMessage extends Message {
  role: "assistant";
}

export interface Chunk {
  forRequestId: string;
  text: string;
}

export interface SuggestionCard {
  id: string;
  title: string;
  content: string;
}
// #endregion

// #region OpenAI API
function getAPIKey() {
  if (typeof window !== "undefined") {
    // @ts-expect-error
    return window.OPENAI_API_KEY;
  } else {
    return process.env["OPENAI_API_KEY"];
  }
}

const openai = new OpenAI({
  apiKey: getAPIKey(),
  dangerouslyAllowBrowser: true,
});
// #endregion

// #region Chat Effect definition, effect creation, and reducer

const initialMessages: Message[] = [];

const loremIpsum =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eget felis eget urna ultricies tincidunt vel ut nisi. Fusce auctor, libero vel lacinia interdum, nibh nisi semper urna, at efficitur metus nulla et lacus.".split(
    " "
  );
// const loremIpsum = "Lorem ipsum dolor sit amet.".split(" ");

const reducer = produce((messages, event) => {
  if (event.type === "request") {
    const userMessage = event.payload;
    const origId = "" + userMessage.id;

    // create placeholder
    const assistantMessage: AssistantMessage = {
      id: origId,
      content: "",
      role: "assistant",
    };

    // prefix only the request in state, so updates find the response
    messages.push({ ...userMessage, id: `req-${origId}` });
    messages.push(assistantMessage);
  }
  if (event.type === "response") {
    const chunk = event.payload;
    const response = messages.find(
      (m) => m.id === chunk.forRequestId && m.role === "assistant"
    );
    response.content += chunk.text;
  }

  if (event.type === "canceled") {
    const response = messages.find(
      (m) => m.id === event.payload.id && m.role === "assistant"
    );
    response.content += " (Canceled)";
  }

  return messages;
});

// 7. TODO Bonus: Introduce a delay after which each token is printed
export const chatFx = createEffect<UserMessage, Chunk, Error, Message[]>(
  // getMockLLMStreamPromise,
  // getMockLLMStreamInterval,
  // getMockLLMStreamRxJS,
  getRealLLMStream,
  initialMessages
);
chatFx.reduceWith(reducer, initialMessages);

function getMockLLMStreamPromise(userMessage: UserMessage): Observable<Chunk> {
  // V0 one solid answer
  return new Promise<Chunk>((resolve) =>
    setTimeout(
      () =>
        resolve({
          forRequestId: userMessage.id,
          text: "The answer is sesame.",
        }),
      1000
    )
  );
}

// Streaming - raw interval - Note RxJS is cleaner
function getMockLLMStreamInterval(userMessage: UserMessage): Observable<Chunk> {
  let wordIdx = 0;

  return new Observable((notify) => {
    const id = setInterval(() => {
      notify.next({
        forRequestId: userMessage.id,
        text: loremIpsum[wordIdx++] + " ",
      });

      if (wordIdx >= loremIpsum.length) {
        clearInterval(id);
        notify.complete();
      }
    }, 500);

    return () => clearInterval(id);
  });
}

function getMockLLMStreamRxJS(userMessage: UserMessage): Observable<Chunk> {
  // V1 streaming - RxJS
  return interval(THRESHOLD.AnimationShort).pipe(
    take(loremIpsum.length - 1),
    map((wordIdx) => ({
      forRequestId: userMessage.id,
      text: loremIpsum[wordIdx] + " ",
    }))
  );
}

function getRealLLMStream(userMessage: UserMessage): Observable<Chunk> {
  // 4. TODO Notify of any error from making the API call
  return new Observable((notify) => {
    let canceled = false; // in order to truly stop streaming

    openai.chat.completions
      .create({
        model: "gpt-4.1",
        messages: [
          ...chatFx.state.value,
          { role: "user", content: userMessage.content },
        ],
        stream: true,
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          const { delta } = chunk.choices[0];

          // If we don't break on cancelation - we will still be consuming the network response,
          // though the UI won't show it. Cancel responsibly.
          if (canceled) break;
          if (!delta.content) continue;

          // notify.next arg becomes a piece of Observable output
          notify.next({
            forRequestId: userMessage.id,
            text: delta.content,
          });
        }
        // Always complete - since .next doesn't complete by itself, unlike Promise.resolve
        notify.complete();
      });

    return () => {
      canceled = true;
    };
  });
}
