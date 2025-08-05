# Project Structure

## Root Directory
```
dify-template-maker/
├── src/mastra/              # Main source directory
├── templates/               # YAML template files for Dify
├── scripts/                 # Build/utility scripts
├── .github/                 # GitHub Actions workflows
├── .husky/                  # Git hooks
├── .vscode/                 # VS Code settings
├── claude-master-book/      # Claude documentation
├── CLAUDE.md               # Claude Code instructions
├── README.md               # Project documentation
├── package.json            # NPM configuration
├── pnpm-lock.yaml          # Lock file
├── tsconfig.json           # TypeScript config
├── biome.json              # Biome linter config
└── .textlintrc.json        # Textlint config
```

## Source Structure (src/mastra/)
```
src/mastra/
├── index.ts                 # Main entry point - Mastra configuration
├── agents/                  # AI agent definitions
│   └── index.ts            # difyTemplateMakerAgent
├── tools/                   # Custom tools
│   ├── index.ts            # Tool exports
│   ├── analyze_request.ts   # Request analysis tool
│   ├── create_dsl_yaml.ts   # DSL YAML generation
│   ├── validate_dsl.ts      # DSL validation tool
│   ├── memory_management.ts # Memory tools
│   └── validators/          # Validation modules
│       ├── index.ts        # Validator exports
│       ├── types.ts        # Validator interface
│       ├── schema.ts       # Schema validator
│       ├── security.ts     # Security validator
│       ├── performance.ts  # Performance validator
│       └── logic.ts        # Logic validator
├── memory/                  # Memory system
│   ├── index.ts            # Memory configuration
│   └── utils.ts            # Helper functions
├── workflows/               # Workflow definitions
│   └── index.ts            # weatherWorkflow
├── prompts/                 # Prompt templates
│   ├── index.ts            # Prompt exports
│   ├── analyze-request.ts  # Analysis prompts
│   └── README.md           # Prompt documentation
└── examples/                # Example usage
    └── memory-usage.ts      # Memory usage examples
```

## Key Files
- **Main Entry**: `src/mastra/index.ts` - Configures Mastra with agents, workflows, and logger
- **Agent Definition**: `src/mastra/agents/index.ts` - Defines the difyTemplateMakerAgent
- **Tool Registry**: `src/mastra/tools/index.ts` - Exports all available tools
- **Memory Config**: `src/mastra/memory/index.ts` - LibSQL memory configuration