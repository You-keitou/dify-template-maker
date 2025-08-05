# Suggested Commands for Dify Template Maker

## Development Commands

### Start Development Server
```bash
pnpm dev              # Start Mastra development server
```

### Code Quality (MUST RUN BEFORE TASK COMPLETION)
```bash
pnpm typecheck        # TypeScript type checking
pnpm lint             # Biome linting
pnpm lint:fix         # Auto-fix linting issues
```

### Documentation
```bash
pnpm textlint         # Lint markdown files
pnpm textlint:fix     # Auto-fix markdown issues
```

### Package Management
```bash
pnpm install          # Install dependencies
pnpm add <package>    # Add new dependency
pnpm add -D <package> # Add dev dependency
```

## System Commands (Darwin/macOS)

### File Operations
```bash
ls                    # List files
find . -name "*.ts"   # Find TypeScript files
grep -r "pattern" .   # Search for pattern in files
```

### Git Commands
```bash
git status            # Check status
git add .             # Stage changes
git commit -m "msg"   # Commit changes
git push              # Push to remote
git checkout develop  # Switch to develop branch
```

### Process Management
```bash
ps aux | grep node    # Find Node.js processes
lsof -i :3000         # Check what's using port 3000
```

## Project-Specific Paths
- Source code: `src/mastra/`
- Templates: `templates/`
- Validators: `src/mastra/tools/validators/`
- Memory utilities: `src/mastra/memory/`