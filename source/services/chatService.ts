import {createEffect, after} from '@rxfx/effect';
import OpenAI from 'openai';
import {Observable} from 'rxjs';

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

	return after(1000, {
		requestId: userMessage.id,
		text: ' delta9',
	});
}
// #endregion

export const chatFx = createEffect<UserMessage, Chunk, Error, Message[]>(
	getLLMStream,
);
