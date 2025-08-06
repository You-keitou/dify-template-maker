# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022
- **Module System**: ES2022 modules (ES modules)
- **Strict Mode**: Enabled
- **Module Resolution**: bundler
- **Source Directory**: src/
- **Output Directory**: dist/

## Biome Configuration (Formatting & Linting)
- **Indentation**: 2 spaces
- **Line Width**: 100 characters maximum
- **Line Ending**: LF
- **Quotes**: Single quotes for JavaScript/TypeScript
- **Semicolons**: Always required
- **Import Organization**: Automatic with Biome
- **Import/Export Types**: Must use `import type` and `export type` where applicable (enforced)

## Code Style Guidelines
1. **Type Safety**: Strict TypeScript mode is enabled - always provide proper types
2. **Imports**: Use type imports (`import type`) for type-only imports
3. **Validation**: Use Zod schemas for runtime validation
4. **File Extension**: .ts for TypeScript files
5. **Module Type**: ES modules (`"type": "module"` in package.json)

## Git Workflow
- **Development Branch**: `develop` (use for all PRs)
- **Pre-commit Hooks**: Automatically run via Husky
  - lint-staged for code formatting
  - Claude log staging
- **PR Summaries**: Generated automatically via GitHub Actions