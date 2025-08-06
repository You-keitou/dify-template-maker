# Memory System Architecture

## Overview
The Dify Template Maker includes a sophisticated memory system for persistent context and personalization, enabling the AI agent to remember user preferences, template history, and learned patterns.

## Storage Backend
- **Database**: LibSQL (SQLite fork optimized for edge computing)
- **Location**: `mastra-memory.db` (local development)
- **Configuration**: `src/mastra/memory/index.ts`

## Memory Types

### 1. Short-term Memory
- Session-based context retention
- Temporary information within a conversation
- Cleared after session ends

### 2. Long-term Memory
- **User Preferences**: Stored preferences for template generation
- **Template History**: Previously generated templates with metadata
- **Learned Patterns**: Common patterns and user-specific optimizations

## Memory Tools
Located in `src/mastra/tools/memory_management.ts`:

1. **updatePreferencesTool**
   - Save/update user preferences
   - Parameters: resourceId, preferences object

2. **getPreferencesTool**
   - Retrieve current user preferences
   - Parameters: resourceId

3. **searchTemplateHistoryTool**
   - Search through past templates
   - Parameters: resourceId, search query

4. **getLearnedPatternsTool**
   - View learned patterns for a user
   - Parameters: resourceId

## Usage Pattern
```typescript
// Always provide resourceId (user ID) and threadId for context
const response = await agent.generate(message, {
  resourceId: userId,
  threadId: threadId,
});
```

## Helper Functions
`src/mastra/memory/utils.ts` provides:
- Database connection helpers
- Query builders
- Data transformation utilities

## Examples
See `src/mastra/examples/memory-usage.ts` for practical examples of:
- Setting up memory context
- Storing preferences
- Retrieving historical data
- Using memory in agent conversations