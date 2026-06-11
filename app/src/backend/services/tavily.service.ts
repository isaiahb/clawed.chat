/**
 * Tavily — real-time web search built for agents.
 *
 * Powers the glasses vision pipeline ("what am I looking at?" → identify →
 * look it up live) and any agent-side search needs.
 *
 *   TAVILY_API_KEY — required to enable search
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY
const TAVILY_API_URL = "https://api.tavily.com/search"

export function isTavilyConfigured(): boolean {
  return Boolean(TAVILY_API_KEY)
}

export interface TavilyResult {
  title: string
  url: string
  content: string
}

export interface TavilySearchResponse {
  /** Tavily's LLM-synthesized answer to the query, when include_answer is on. */
  answer?: string
  results: TavilyResult[]
}

export async function tavilySearch(
  query: string,
  opts: {maxResults?: number; includeAnswer?: boolean} = {},
): Promise<TavilySearchResponse> {
  if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not configured")

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: opts.maxResults ?? 5,
      include_answer: opts.includeAnswer ?? true,
      search_depth: "basic",
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Tavily error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    answer?: string
    results?: Array<{title?: string; url?: string; content?: string}>
  }

  return {
    answer: data.answer,
    results: (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
    })),
  }
}
