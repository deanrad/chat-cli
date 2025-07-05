# Conversational UX with RxFx

An example app of how RxFx can enable simpler building of Conversational UX apps, using the style of ChatGPT, and featuring streaming, cancelation, and activity detection, with no async React code.

## Files

- `app.tsx` - The application shell in React
- `effects/chatEffect.ts` - The plain JS RxFx Effect with mock and real chat responses

## Steps to build:

1. Send requests, get single, then streaming updates
2. Display logs
3. Add Loading/Active states
4. Support Cancelation, Reset
5. Handle errors
6. Block new requests while active

_Can be speed-run in 15 minutes!_

## Requirements:

Needs your OpenAPI key..

```
export OPENAI_API_KEY=# your key here
```

## Finished Version Demo

![Finished Version Demo](https://d2jksv3bi9fv68.cloudfront.net/converation-ux-rxfx-demo-1.gif)
