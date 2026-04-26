<div align="center">
  <h1>🤖 AiKit News</h1>

  <p>
    <strong>AI-powered search and deep research app - powered by ChatJimmy and Exa</strong>
  </p>

  <p>
    <a href="#features">Features</a> &middot;
    <a href="#endpoints">Endpoints</a> &middot;
    <a href="#quick-start">Quick Start</a> &middot;
    <a href="#examples">Examples</a> &middot;
    <a href="#deep-research">Deep Research</a> &middot;
    <a href="#architecture">Architecture</a> &middot;
    <a href="#deploy">Deploy</a> &middot;
    <a href="#license">License</a>
  </p>

  <br/>
</div>

> **App:** AiKit
>
> **Model:** `llama3.1-8B`
>
> **Search:** Exa web search

---

<a id="overview"></a>

## 🌟 Overview

AiKit is a modern AI search app that combines fast chat, live web search, inline citations, and multi-step deep research. It uses a Next.js frontend, internal streaming API routes, Exa for web results, and ChatJimmy's `llama3.1-8B` backend for answers.

Ask a normal question for a quick answer, or turn on **Deep Research** when you want AiKit to search, analyze, follow up, and synthesize a richer response.

This project is unofficial and is not affiliated with chatjimmy.ai or Exa.

---

<a id="features"></a>

## ✨ Key Features

- **Instant AI search** - routes questions through a smart search decision step
- **Live web results** - uses Exa search with titles, URLs, highlights, and page text
- **Inline citations** - answers cite sources with clean `[1]`, `[2]`, `[3]` markers
- **Deep Research mode** - explores follow-up questions across multiple search steps
- **Streaming responses** - SSE-style streaming for chat and research progress
- **Research timeline** - visual progress for searching, analyzing, and answer writing
- **Markdown rendering** - supports markdown, GitHub-flavored tables, code highlighting, and math
- **Citation cleanup** - removes stale citations from conversation history
- **Latency diagnostics** - logs client timing and server timing in DevTools
- **Modern UI** - built with React, Tailwind CSS, and Framer Motion

---

<a id="endpoints"></a>

## 🛠️ Endpoints

| Method | Path                 | Description                                   |
| ------ | -------------------- | --------------------------------------------- |
| `POST` | `/api/chat`          | Streams an AI answer using ChatJimmy          |
| `POST` | `/api/search`        | Searches the web through Exa                  |
| `POST` | `/api/deep-research` | Runs multi-step research and streams progress |

All API routes are internal Next.js routes and return JSON or `text/event-stream`.

---

<a id="quick-start"></a>

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm
- Exa API key

### Setup

```bash
git clone <your-repo-url> AiKit
cd AiKit
npm install
cp .env.example .env.local
```

Add your Exa key:

```bash
EXA_API_KEY=your_exa_key_here
```

### Development

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

---

<a id="examples"></a>

## 💡 Usage Examples

### Chat Request

```bash
curl http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "answer",
    "messages": [
      { "role": "user", "content": "Explain RAG in simple words" }
    ]
  }'
```

The response streams SSE chunks:

```txt
data: {"choices":[{"delta":{"content":"RAG "}}]}

data: {"choices":[{"delta":{"content":"means..."}}]}

data: [DONE]
```

### Web Search

```bash
curl http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "latest AI search trends"
  }'
```

### Chat With Sources

```javascript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "answer",
    messages: [{ role: "user", content: "What changed in AI search recently?" }],
    searchResults: [
      {
        title: "Example source",
        url: "https://example.com",
        text: "Source text used as model context",
      },
    ],
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

---

<a id="deep-research"></a>

## 🔎 Deep Research

Deep Research mode turns one question into a small research tree:

1. Search the original query
2. Synthesize what was found
3. Generate follow-up questions
4. Search those follow-ups
5. Write a final cited answer

### Deep Research Request

```bash
curl http://localhost:3000/api/deep-research \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How are AI agents changing software development?"
  }'
```

### Stream Events

| Event               | Meaning                             |
| ------------------- | ----------------------------------- |
| `step_start`        | A research step has started         |
| `search_complete`   | Exa returned sources for the step   |
| `synthesizing`      | AiKit is analyzing the sources      |
| `step_done`         | Step synthesis is complete          |
| `research_complete` | Source collection is complete       |
| `answer_start`      | Final answer generation has started |
| `answer_chunk`      | Final answer text chunk             |
| `all_sources`       | Final citation source list          |
| `done`              | Research finished                   |

---

<a id="architecture"></a>

## 🏗️ Architecture

```txt
User Question
  |
  v
Next.js UI
  |
  +--> Instant Mode
  |      |
  |      v
  |   /api/chat router
  |      |
  |      +--> Direct answer
  |      |
  |      +--> SEARCH: refined query
  |              |
  |              v
  |          /api/search
  |              |
  |              v
  |          Exa results
  |              |
  |              v
  |          /api/chat answer
  |              |
  |              v
  |          Cited response
  |
  +--> Deep Research Mode
         |
         v
     /api/deep-research
         |
         v
     Search -> Synthesize -> Follow-ups
         |
         v
     Final sourced answer
```

### Core Files

| File                                      | Purpose                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `src/app/page.tsx`                        | Main chat UI, routing logic, streaming handlers |
| `src/app/api/chat/route.ts`               | Chat route using ChatJimmy                      |
| `src/app/api/search/route.ts`             | Exa instant search route                        |
| `src/app/api/deep-research/route.ts`      | Multi-step research route                       |
| `src/lib/jimmy.ts`                        | ChatJimmy backend adapter                       |
| `src/lib/prompts.ts`                      | Router and answer system prompts                |
| `src/components/ChatInput.tsx`            | Prompt input and Deep Research toggle           |
| `src/components/SearchTimeline.tsx`       | Live search progress UI                         |
| `src/components/DeepResearchTimeline.tsx` | Multi-step research progress UI                 |

---

<a id="configuration"></a>

## ⚙️ Configuration

### Environment Variables

| Variable      | Required | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `EXA_API_KEY` | Yes      | API key used by `/api/search` and `/api/deep-research` |

### App Constants

| Location                             | Value                         | Description                      |
| ------------------------------------ | ----------------------------- | -------------------------------- |
| `src/lib/jimmy.ts`                   | `llama3.1-8B`                 | ChatJimmy model                  |
| `src/lib/jimmy.ts`                   | `topK: 8`                     | Sampling option sent upstream    |
| `src/lib/jimmy.ts`                   | `MAX_SYSTEM_PROMPT = 20000`   | Max system prompt characters     |
| `src/app/api/search/route.ts`        | `numResults: 8`               | Instant search result count      |
| `src/app/api/deep-research/route.ts` | `MAX_DEPTH = 3`               | Deep research depth              |
| `src/app/api/deep-research/route.ts` | `MAX_SOURCES_FOR_ANSWER = 18` | Sources passed into final answer |

---

<a id="deploy"></a>

## 🚀 Deploy

### Vercel

1. Push the repo to GitHub
2. Import it in Vercel
3. Add `EXA_API_KEY` in Environment Variables
4. Deploy

### Self-hosted Node

```bash
npm install
npm run build
npm run start
```

### Cloudflare Notes

The repo includes OpenNext and Wrangler configuration files:

- `open-next.config.ts`
- `wrangler.jsonc`

Use them if you want to deploy the Next.js app to Cloudflare Workers with OpenNext. Make sure your Cloudflare build command, output directory, routes, and environment variables match your deployment target.

---

## 🧪 Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the local Next.js dev server |
| `npm run build` | Build the production app           |
| `npm run start` | Start the production server        |
| `npm run lint`  | Run ESLint                         |

---

<a id="license"></a>

## 📜 License

No license file is included yet. Add a `LICENSE` file before publishing or distributing this project.
