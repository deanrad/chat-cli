//@ts-nocheck
import React, { useState, useEffect } from "react";
import { Text, Box, useStdout, useInput } from "ink";
import TextInput from "ink-text-input";
import { useWhileMounted } from "@rxfx/react";
import { trace } from "rxfx";

import { useFx } from "@rxfx/react";
import { chatFx } from "./effects/chatEffect.js";

interface ChatMessageProps {
  message: Message;
}

const banner = `
 ,ggggggggggg,             ,gggggggggggggg
dP"""88""""""Y8,          dP""""""88""""""
Yb,  88      \`8b          Yb,_    88
 \`"  88      ,8P           \`""    88
     88aaaad8P"                ggg88gggg
     88""""Yb,       ,gg,   ,gg   88   8,gg,   ,gg
     88     "8b     d8""8b,dP"    88   d8""8b,dP"
     88      \`8i   dP   ,88"gg,   88  dP   ,88"
     88       Yb,,dP  ,dP"Y8,"Yb,,8P,dP  ,dP"Y8,
     88        Y88"  dP"   "Y8 "Y8P'8"  dP"   "Y8
`;

const cannedPrompts = [
  "Who is Sam Altman?",
  "Who was Grace Hopper?",
  "What's your name?",
];
let promptIdx = 0;

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  return (
    <Box justifyContent={isUser ? "flex-end" : "flex-start"}>
      <Text>{message.content + "\n"} </Text>
    </Box>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const { write } = useStdout();

  // 1. TODO Hook up service state as variable 'messages'
  // 3. TODO show loading/active states
  const { state: messages, isActive, isLoading, currentError } = useFx(chatFx);

  // 2. Display log messages
  // useTrace(chatFx, "chat-fx");

  useInput((_, key) => {
    if (key.escape) {
      // 4. TODO suppport cancelation, reset
      if (isActive) {
        chatFx.cancelCurrent();
      } else {
        chatFx.reset();
      }
    }

    if (key.upArrow) {
      setQuery(cannedPrompts[promptIdx++ % 3]); // just an example
    }
  });

  function handleSubmit(value) {
    const userMessage = {
      role: "user",
      content: value,
    };
    setQuery("");

    // 1. TODO Call chat effect with userMessage
    chatFx(userMessage);
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{banner}</Text>
      </Box>
      <Box flexDirection="column">
        {messages.map((message, idx) => (
          <ChatMessage key={idx} message={message} />
        ))}
      </Box>
      <Box>
        <Text>
          {/* 3. TODO Display Loading, Active states */}
          {isActive ? (isLoading ? "(Loading) " : "(Working) ") : ""}
          {/* 5. TODO Trap and display any error */}
          {currentError ? <Text color="red">{currentError + "\n"}</Text> : ""}
          Ask the <Text bold>AI</Text>{" "}
          <Text dimColor> (Esc to cancel, Ctrl-C to quit)</Text>:
        </Text>
      </Box>
      <Box flexDirection="row" borderStyle="double">
        <Text> &gt; </Text>
        <TextInput
          value={query}
          onChange={(v) => {
            // 6. TODO Block while answering
            if (isActive) return;
            setQuery(v);
          }}
          onSubmit={(value) => {
            // 6. TODO Block while answering
            if (isActive) return;
            handleSubmit(value);
          }}
          width={50}
          alignSelf="auto"
        ></TextInput>
      </Box>
    </Box>
  );
}

// trace utility hook - avail in @rxfx/react 1.1.7
function useTrace(
  fx: EffectRunner<any, any>,
  name: string,
  traceFn = console.log.bind(console)
) {
  useWhileMounted(() =>
    trace(fx, name, (type, payload) => {
      traceFn(`${type}: ${JSON.stringify(payload)}`);
    })
  );
}
