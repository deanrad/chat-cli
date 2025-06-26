//@ts-nocheck
import React, {useState, useEffect} from 'react';
import {Text, Box, useStdout, useInput} from 'ink';
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

	// Esc key cancels
	useInput((_, key) => {
		// write('got input');
		if (key.escape) {
			// write('got Esc');
			chatFx.cancelCurrent();
		}

		if (key.upArrow) {
			setQuery('Who is Sam Altman?');
		}
	});

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
				<Text>{banner}</Text>
			</Box>
			<Box flexDirection="column">
				{messages.map((message, idx) => (
					<ChatMessage key={idx} message={message} />
				))}
			</Box>
			<Box>
				<Text>
					Ask the <Text bold>AI</Text>{' '}
					<Text dimColor> (Esc to cancel, Ctrl-C to quit)</Text>:
				</Text>
			</Box>
			<Box flexDirection="row" borderStyle="double">
				<Text> &gt; </Text>
				<TextInput
					value={query}
					onChange={v => {
						// TODO don't allow input changes when active
						setQuery(v);
					}}
					onSubmit={value => {
						// TODO don't allow input submissions when active
						handleSubmit(value);
					}}
					width={50}
					alignSelf="auto"
				></TextInput>
			</Box>
		</Box>
	);
}
