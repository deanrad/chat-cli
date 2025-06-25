//@ts-nocheck
import React, {useState, useEffect} from 'react';
import {Text, Box, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import {chatFx} from './services/chatService.js';
import {trace} from '@rxfx/effect';
import {useAtMountTime} from '@rxfx/react';
type Props = {
	name: string | undefined;
};

export default function App({name = 'Stranger'}: Props) {
	const [query, setQuery] = useState('');
	const {write} = useStdout();

	function handleSubmit(value) {
		const userMessage = {
			id: '1234',
			content: value,
			role: 'user',
			createdAt: new Date(),
		};
		chatFx.request(userMessage);
	}

	// log all events (their types)
	useAtMountTime(() =>
		trace(chatFx, 'chat', (type, payload) => {
			write(type + ': ' + JSON.stringify(payload) + '\n');
		}),
	);

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
		</Box>
	);
}
