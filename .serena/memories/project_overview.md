# Dify Template Maker - Project Overview

## Purpose
This is a Dify Template Maker - a tool for creating and validating templates for the Dify platform using AI agents built on the Mastra framework. The project helps users generate YAML templates for Dify workflows and validates them for correctness, security, and performance.

## Tech Stack
- **Framework**: Mastra (AI agent orchestration framework)
- **Language**: TypeScript with ES modules
- **AI SDKs**: 
  - Google AI SDK (@ai-sdk/google)
  - OpenAI SDK (@ai-sdk/openai)
- **Validation**: Zod for runtime schema validation
- **Database**: LibSQL (SQLite) for memory storage
- **Package Manager**: pnpm
- **Linting/Formatting**: Biome
- **Git Hooks**: Husky with lint-staged
- **Markdown Linting**: textlint (Japanese technical writing presets)

## Key Features
1. AI-powered template generation for Dify platform
2. Comprehensive validation system with multiple validators:
   - Schema validation
   - Security validation
   - Performance validation
   - Logic validation
3. Memory system for persistent context and personalization
4. Support for multiple AI providers (Google AI, OpenAI)