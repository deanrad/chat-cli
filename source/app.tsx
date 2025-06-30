//@ts-nocheck
import React, { useState, useEffect } from "react";
import { Text, Box, useStdout, useInput } from "ink";
import TextInput from "ink-text-input";
import { chatFx } from "./effects/chatEffect.js";
import { useWhileMounted, useService } from "@rxfx/react";

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

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  return (
    <Box justifyContent={isUser ? "flex-end" : "flex-start"}>
      <Text>{message.content + "\n"} </Text>
    </Box>
  );
}

const randomId = (length = 7) => {
  return Math.floor(Math.pow(2, length * 4) * Math.random())
    .toString(16)
    .padStart(length, "0");
};

export default function App() {
  const [query, setQuery] = useState("");
  const { write } = useStdout();

  // TODO Hook up service state as variable 'messages'
  const { state: messages, isActive: isWorking } = useService(chatFx);
  // TODO distinguish loading (before response) from working (active)
  const [hasFirstChunk, setHasFirstChunk] = useState(false);
  useWhileMounted(() =>
    chatFx.observe({
      response() {
        setHasFirstChunk(true);
      },
      finalized() {
        setHasFirstChunk(false);
      },
    })
  );

  useInput((_, key) => {
    if (key.escape) {
      // TODO suppport cancelation
      chatFx.cancelCurrent();
    }

    if (key.upArrow) {
      setQuery("Who is Sam Altman?"); // just an example
    }
  });

  function handleSubmit(value) {
    const userMessage = {
      id: randomId(),
      content: value,
      role: "user",
      createdAt: new Date(),
    };
    setQuery("");

    // TODO send userMessage to service
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
          {/* TODO display a loading state */}
          {isWorking ? (hasFirstChunk ? "(Working) " : "(Loading) ") : ""}
          Ask the <Text bold>AI</Text>{" "}
          <Text dimColor> (Esc to cancel, Ctrl-C to quit)</Text>:
        </Text>
      </Box>
      <Box flexDirection="row" borderStyle="double">
        <Text> &gt; </Text>
        <TextInput
          value={query}
          onChange={(v) => {
            // TODO Disable typing while working
            setQuery(v);
          }}
          onSubmit={(value) => {
            // TODO Disable typing while working
            handleSubmit(value);
          }}
          width={50}
          alignSelf="auto"
        ></TextInput>
      </Box>
    </Box>
  );
}
