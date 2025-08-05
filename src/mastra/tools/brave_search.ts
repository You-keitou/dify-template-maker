import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
  age: z.string().optional(),
});

export const braveSearchTool = createTool({
  id: 'brave-web-search',
  description:
    'Search the web using Brave Search API for information, best practices, and examples',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information'),
    count: z.number().optional().default(5).describe('Number of results to return (1-20)'),
  }),
  outputSchema: z.object({
    results: z.array(searchResultSchema),
    query: z.string(),
    total_results: z.number().optional(),
  }),
  execute: async ({ context }) => {
    const { query, count = 5 } = context;

    // Ensure we have API key
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY environment variable is not set');
    }

    try {
      // Call Brave Search API
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform results to our schema
      const results =
        data.web?.results?.map((result: unknown) => {
          const r = result as {
            title?: string;
            url?: string;
            description?: string;
            snippet?: string;
            age?: string;
          };
          return {
            title: r.title || '',
            url: r.url || '',
            description: r.description || r.snippet || '',
            age: r.age || undefined,
          };
        }) || [];

      return {
        results,
        query,
        total_results: data.web?.total || 0,
      };
    } catch (error) {
      console.error('Brave Search error:', error);
      throw new Error(
        `Failed to search web: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

export const difyBestPracticesSearchTool = createTool({
  id: 'dify-best-practices-search',
  description: 'Search specifically for Dify platform best practices, templates, and documentation',
  inputSchema: z.object({
    topic: z.string().describe('The Dify-related topic to search for'),
    includeGithub: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include GitHub repositories in search'),
  }),
  outputSchema: z.object({
    results: z.array(searchResultSchema),
    query: z.string(),
    sources: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { topic, includeGithub = true } = context;

    // Construct specialized query for Dify
    let query = `Dify platform ${topic} best practices workflow template`;
    if (includeGithub) {
      query += ' site:github.com OR site:dify.ai';
    }

    // Call Brave Search API directly instead of using the tool internally
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY environment variable is not set');
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform results
    const allResults =
      data.web?.results?.map((result: unknown) => {
        const r = result as {
          title?: string;
          url?: string;
          description?: string;
          snippet?: string;
          age?: string;
        };
        return {
          title: r.title || '',
          url: r.url || '',
          description: r.description || r.snippet || '',
          age: r.age || undefined,
        };
      }) || [];

    // Filter and categorize results
    const sources: string[] = [];
    const filteredResults = allResults.filter(
      (result: { url: string; title: string; description: string }) => {
        const url = result.url.toLowerCase();
        if (url.includes('github.com')) {
          sources.push('GitHub');
          return true;
        }
        if (url.includes('dify.ai')) {
          sources.push('Official Dify');
          return true;
        }
        if (
          result.title.toLowerCase().includes('dify') ||
          result.description.toLowerCase().includes('dify')
        ) {
          sources.push('Community');
          return true;
        }
        return false;
      },
    );

    return {
      results: filteredResults.slice(0, 5), // Top 5 most relevant
      query,
      sources: [...new Set(sources)], // Unique sources
    };
  },
});
