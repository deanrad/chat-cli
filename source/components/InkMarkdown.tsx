// @ts-nocheck
import React from 'react';
import {Text, Box} from 'ink';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const InlineCode = ({children}) => (
	<Text dimColor color="gray">
		{children}
	</Text>
);

const CodeBlock = ({children}) => (
	<Box flexDirection="column">
		<Text dimColor color="gray">
			{String(children).replace(/\n$/, '')}
		</Text>
	</Box>
);

const Link = ({href, children}) => (
	<Text underline color="blue">
		{children} ({href})
	</Text>
);

const ListItem = ({children, checked}) => {
	const bullet =
		checked === null || checked === undefined ? '•' : checked ? '[x]' : '[ ]';
	return (
		<Text>
			{bullet} {children}
		</Text>
	);
};

export default function InkMarkdown({source}: {source: string}) {
	return (
		<Box flexDirection="column">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					code: ({inline, children}) =>
						inline ? (
							<InlineCode>{children}</InlineCode>
						) : (
							<CodeBlock>{children}</CodeBlock>
						),
					p: ({children}) => <Text>{children}</Text>,
					strong: ({children}) => <Text bold>{children}</Text>,
					em: ({children}) => <Text italic>{children}</Text>,
					h1: ({children}) => <Text bold>{children}</Text>,
					h2: ({children}) => <Text bold>{children}</Text>,
					h3: ({children}) => <Text bold>{children}</Text>,
					ul: ({children}) => <Box flexDirection="column">{children}</Box>,
					ol: ({children}) => <Box flexDirection="column">{children}</Box>,
					li: ListItem,
					a: Link,
					blockquote: ({children}) => (
						<Text dimColor italic>
							{children}
						</Text>
					),
				}}
			>
				{source}
			</ReactMarkdown>
		</Box>
	);
}
