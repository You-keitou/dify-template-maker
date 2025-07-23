# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
This is a Dify Template Maker - a tool for creating and validating templates for the Dify platform using AI agents built on the Mastra framework.

## Essential Commands

```bash
# Development
pnpm dev              # Start Mastra development server

# Type Checking and Linting (ALWAYS run these before considering tasks complete)
pnpm typecheck        # TypeScript type checking
pnpm lint             # Biome linting
pnpm lint:fix         # Auto-fix linting issues

# Documentation
pnpm textlint         # Lint markdown files
pnpm textlint:fix     # Auto-fix markdown issues
```

## Architecture

### Core Structure
- **Mastra Framework**: The project uses Mastra for AI agent orchestration
- **ES Modules**: TypeScript project using ES modules (`"type": "module"` in package.json)
- **Main Entry**: `src/mastra/index.ts` - Mastra configuration and initialization

### Key Directories
- `/src/mastra/agents/` - AI agent definitions
- `/src/mastra/tools/` - Custom tools (request analysis, DSL validation)
- `/src/mastra/validators/` - Validation modules (schema, security, performance, logic)
- `/src/mastra/workflows/` - Workflow definitions
- `/templates/` - YAML template files for Dify platform

### Validation Architecture
The validation system is modular with specialized validators:
- `SchemaValidator` - Validates DSL structure against Dify schema
- `SecurityValidator` - Checks for security vulnerabilities
- `PerformanceValidator` - Analyzes performance implications
- `LogicValidator` - Validates workflow logic and flow

Each validator implements the `Validator` interface with `validate()` and `fix()` methods.

### AI Integration
- Supports both Google AI (`@google/generative-ai`) and OpenAI SDKs
- Model selection based on `MASTRA_LLM_PROVIDER` environment variable
- Agent configurations in `/src/mastra/agents/`

## Development Guidelines

### Code Style
- **Formatting**: 2 spaces, single quotes, semicolons required (enforced by Biome)
- **Line Width**: 100 characters maximum
- **Imports**: Use type imports where applicable (`import type`)

### Git Workflow
- Development branch: `develop` (use for PRs)
- Husky pre-commit hooks run automatically
- PR summaries generated via GitHub Actions

### Type Safety
- Strict TypeScript mode enabled
- Always run `pnpm typecheck` before completing tasks
- Use Zod schemas for runtime validation (see `/src/mastra/tools/` for examples)

## Memory System

### Overview
The agent now includes memory capabilities for persistent context and personalization:
- **Short-term memory**: Session-based context retention
- **Long-term memory**: User preferences, template history, and learned patterns
- **Storage**: LibSQL (SQLite) for local development

### Memory Components
- `/src/mastra/memory/index.ts` - Memory configuration with LibSQL
- `/src/mastra/memory/utils.ts` - Helper functions for memory operations
- `/src/mastra/tools/memory_management.ts` - Memory management tools

### Memory Usage
When interacting with the agent, provide `resourceId` (user ID) and `threadId` for memory context:
```typescript
const response = await agent.generate(message, {
  resourceId: userId,
  threadId: threadId,
});
```

### Memory Tools
- `updatePreferencesTool` - Save user preferences
- `getPreferencesTool` - Retrieve current preferences
- `searchTemplateHistoryTool` - Search past templates
- `getLearnedPatternsTool` - View learned patterns

## Common Tasks

### Adding a New Validator
1. Create a new file in `/src/mastra/validators/`
2. Implement the `Validator` interface
3. Add to the validator chain in `/src/mastra/tools/dsl-validation-tool.ts`

### Working with Templates
- Templates are stored in `/templates/` as YAML files
- Use the DSL validation tool to validate template structure
- Reference existing templates for Dify DSL format

### Working with Memory
- Examples available in `/src/mastra/examples/memory-usage.ts`
- Memory data stored in `mastra-memory.db` (LibSQL)
- Always provide `resourceId` and `threadId` for memory context

### Debugging Mastra Workflows
- Check `/src/mastra/workflows/` for workflow definitions
- Use `pnpm dev` to start the Mastra development server
- Logs and debugging info available in the Mastra UI