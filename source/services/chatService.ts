// @ts-nocheck
import {createEffect, after} from '@rxfx/effect';
import OpenAI from 'openai';
import {Observable} from 'rxjs';
import {produce} from 'immer';

// #region Types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
	id: string;
	content: string;
	role: MessageRole;
	createdAt: Date;
	isComplete?: boolean;
}
export interface UserMessage extends Message {
	role: 'user';
}
export interface AssistantMessage extends Message {
	role: 'assistant';
}

export interface Chunk {
	requestId: string;
	text: string;
}

export interface SuggestionCard {
	id: string;
	title: string;
	content: string;
}
// #endregion

// #region OpenAI API
let openai;

function getAPIKey() {
	if (typeof window !== 'undefined') {
		// @ts-expect-error
		return window.OPENAI_API_KEY;
	} else {
		return process.env['OPENAI_API_KEY'];
	}
}

function getLLMStream(userMessage: UserMessage): Observable<Chunk> {
	try {
		openai ||= new OpenAI({
			apiKey: getAPIKey(),
			dangerouslyAllowBrowser: true,
		});
	} catch (error) {
		console.error('Failed to initialize OpenAI:', error);
	}

	// return after(1000, {
	// 	requestId: userMessage.id,
	// 	text: ' delta9',
	// });
	return new Observable(notify => {
		let canceled = false; // in order to truly stop pulling from the

		openai.chat.completions
			.create({
				model: 'gpt-4.1',
				messages: [
					{
						role: 'user',
						// content: "Say 'double bubble bath' 3 times fast.",
						content: userMessage.content,
					},
				],
				stream: true,
			})
			.then(async stream => {
				for await (const chunk of stream) {
					const {delta} = chunk.choices[0];

					if (!delta.content) continue;

					// If we don't break on cancelation - the UI will not show chunks,
					// but we can show we will still be consuming the network response. Cancel responsibly.
					// console.log("chunk: " + delta.content);
					if (canceled) break;

					// notify.next args become a piece of Observable output
					notify.next({
						requestId: userMessage.id,
						text: delta.content,
					});
				}
				// and we should always complete when done
				notify.complete();
			});
		return () => {
			canceled = true;
		};
	});
}
// #endregion

export const chatFx = createEffect<UserMessage, Chunk, Error, Message[]>(
	getLLMStream,
);

// Use the reducer to populate chatRxFxService.state
chatFx.reduceWith(
	produce((messages, event) => {
		if (event.type === 'request') {
			const userMessage = event.payload;
			const origId = '' + userMessage.id;

			// create placeholder
			const assistantMessage: AssistantMessage = {
				id: origId,
				content: '',
				role: 'assistant',
				createdAt: new Date(),
				isComplete: false,
			};

			// prefix only the request in state, so updates find the response
			messages.push({...userMessage, id: `req-${origId}`});
			messages.push(assistantMessage);
		}
		if (event.type === 'response') {
			const chunk = event.payload;
			const response = messages.find(
				m => m.id === chunk.requestId && m.role === 'assistant',
			);
			response.content += chunk.text;
		}

		if (event.type === 'canceled') {
			const response = messages.find(
				m => m.id === event.payload.id && m.role === 'assistant',
			);
			response.content += ' (Canceled)';
		}

		return messages;
	}),
	[], // initial value - lost way down below :o
);
