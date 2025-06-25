//@ts-nocheck
import React, {useState, useEffect} from 'react';
import {Text, Box, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import {chatFx, Message} from './services/chatService.js';
import {trace} from '@rxfx/effect';
import {useAtMountTime, useService} from '@rxfx/react';
type Props = {
	name: string | undefined;
};

interface ChatMessageProps {
	message: Message;
}

export function ChatMessage({message}: ChatMessageProps) {
	const isUser = message.role === 'user';
	return (
		<Box justifyContent={isUser ? 'flex-end' : 'flex-start'}>
			<Text>{message.content + '\n'} </Text>
		</Box>
	);
}

const randomId = (length = 7) => {
	return Math.floor(Math.pow(2, length * 4) * Math.random())
		.toString(16)
		.padStart(length, '0');
};

export default function App({name = 'Stranger'}: Props) {
	const [query, setQuery] = useState('');
	const {write} = useStdout();
	const {state: messages} = useService(chatFx);

	function handleSubmit(value) {
		const userMessage = {
			id: randomId(),
			content: value ?? 'Explain AI in 2 sentences to an 8 year old.',
			role: 'user',
			createdAt: new Date(),
		};
		chatFx.request(userMessage);
		setQuery('');
	}

	// log all events (their types)
	// useAtMountTime(() =>
	// 	trace(chatFx, 'chat', (type, payload) => {
	// 		write(type + ': ' + JSON.stringify(payload) + '\n');
	// 	}),
	// );

	return (
		<Box flexDirection="column">
			<Box>
				<Text>
					Ask the all knowing <Text bold>AI</Text>:
				</Text>
			</Box>
			<Box flexDirection="row">
				<TextInput
					value={query}
					onChange={setQuery}
					onSubmit={handleSubmit}
					width={50}
					alignSelf="auto"
				></TextInput>
			</Box>
			<Box>
				<Text backgroundColor={'#33AA33'} color={'white'} bold>
					Submit
				</Text>
			</Box>
			<Box flexDirection="column">
				{messages.map((message, idx) => (
					<ChatMessage key={idx} message={message} />
				))}
			</Box>
		</Box>
	);
}
