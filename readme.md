# Conversational UX with RxFx

An example app of how RxFx can enable simpler building of Conversational UX apps, using the style of ChatGPT, and featuring streaming, cancelation, and activity detection, with no async React code.

## Files

- `app.tsx` - The application shell in React
- `effects/chatEffect.ts` - The plain JS RxFx Effect with mock and real chat responses

## Steps to build:

0. An Application Shell
1. Call out to ChatFX
2. Write a Promise-based Effect, and pure reducer.
3. Hook back into React - see result!
4. A one-liner loading state
5. Seamlessly stream
6. A one-liner "Thinking" state
7. Impatiently Cancel & Reset
8. Unmock, and find the Error with `useTrace`
9. Display the error with `currentError`
10. Fix the Error and tada, see conversation, context, etc..

Bonus: Control Concurrency with `useBlockingEffect`

_Can be done in under 15 minutes!_

## Requirements:

Needs your OpenAPI key..

```
export OPENAI_API_KEY=# your key here
```

## Finished Version Demo

![Finished Version Demo](https://d2jksv3bi9fv68.cloudfront.net/converation-ux-rxfx-demo-1.gif)
