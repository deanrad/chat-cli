import { createBlockingEffect as createEffect, Observable } from "rxfx";
import OpenAI from "openai";
import { produce } from "immer";

import { concatMap, after, THRESHOLD, randomizePreservingAverage } from "rxfx";
import { interval } from "rxjs";
import { take, map, delay } from "rxjs/operators";

// #region Types
export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}
export interface UserMessage extends Message {
  role: "user";
}
export interface AssistantMessage extends Message {
  role: "assistant";
}

type Chunk = string;
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

// prettier-ignore
const mockAnswerWords =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eget felis eget urna ultricies tincidunt vel ut nisi.".split(" ");

// #region Chat Effect definition, effect creation, and reducer

const initialMessages: Message[] = [];

export const chatFx = createEffect<UserMessage, Chunk, Error, Message[]>(
  // 1. TODO Iterate through mocks toward the full real stream
  // getMockLLMStreamPromise,
  // getMockLLMStreamInterval,
  getRealLLMStream,
  initialMessages
);

chatFx.reduceWith(
  produce((messages, event) => {
    // 1. TODO merge request/response event payloads into state
    if (event.type === "request") {
      const userMessage = event.payload;

      messages.push(userMessage);
      messages.push({
        role: "assistant",
        content: "", // placeholder for response
      });
    }

    if (event.type === "response") {
      const chunk = event.payload;
      const response = messages[messages.length - 1]!;
      response.content += chunk;
    }

    if (event.type === "canceled") {
      const chunk = event.payload;
      const response = messages[messages.length - 1]!;
      response.content += " (Canceled)";
    }

    return messages;
  }),
  initialMessages
);

function getMockLLMStreamPromise(userMessage: UserMessage): Promise<Chunk> {
  // V0 answer
  return new Promise<Chunk>((resolve) =>
    setTimeout(() => resolve(mockAnswerWords.join(" ")), 2500)
  );
}

// Streaming - raw interval - Note RxJS is cleaner
function getMockLLMStreamInterval(userMessage: UserMessage): Observable<Chunk> {
  return new Observable((notify) => {
    // notify.next|complete|error

    let wordIdx = 0;
    const id = setInterval(() => {
      notify.next(mockAnswerWords[wordIdx++] + " ");

      if (wordIdx >= mockAnswerWords.length) {
        clearInterval(id);
        notify.complete();
      }
    }, THRESHOLD.AnimationShort);

    // cleanup function
    return () => clearInterval(id);
  });
}

function getRealLLMStream(userMessage: UserMessage): Observable<Chunk> {
  return new Observable((notify) => {
    // notify.next|complete|error

    let canceled = false;

    // We have to chain the first Promise since Observable expects a synchronous
    // return value of the cancelation function
    openai.chat.completions
      .create({
        model: "gpt-4.1",
        messages: [
          // Include previous messages in the conversation for context!
          ...chatFx.state.value!,
          { role: "user", content: userMessage.content },
        ],
        stream: true,
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          const { delta } = chunk.choices[0]!;

          // If we don't break on cancelation - we will still be consuming the network response,
          // though the UI won't show it. Cancel responsibly.
          if (!delta.content) continue;
          if (canceled) break;

          // notify.next arg becomes a piece of Observable output
          notify.next(delta.content);
        }
        // Always complete - since .next doesn't complete by itself, unlike Promise.resolve
        notify.complete();
      })
      .catch((ex) => {
        notify.error(ex.message.split(".")[0]);
      });

    return () => {
      canceled = true;
    };
  });
}
