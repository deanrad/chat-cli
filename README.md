# Conversational UX with RxFx

An example app of how RxFx can _very simply_ build a React web, mobile, or even command-line app in the style of ChatGPT.

Featuring streaming, cancelation, and activity detection, building mostly in the React-Free Zone.

## Branches:

- `demo-start` - An empty app shell with TODO comments
- `finish` - App shell has all the features

## Steps to build:

1. Basic request/streaming response/state working
2. Include previous message history
3. Add Working/Loading states
4. Support Cancelation
5. Show and clear errors
6. Block while answering.
7. Adjust timing of printed chunks for human-like feel (bonus!)

20m - can be speed-run in < 10 minutes!

## Requirements:

Needs your OpenAPI key..

```
export OPENAI_API_KEY=# your key here
```

To clear it and force an error, remove the API key.

```
export OPENAI_API_KEY_BAK=$OPENAI_API_KEY; export OPENAI_API_KEY=

# and restore it
export OPENAI_API_KEY=$OPENAI_API_KEY_BAK;
```
