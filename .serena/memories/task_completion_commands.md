# Task Completion Commands

## REQUIRED Commands Before Considering Any Task Complete

Always run these commands in order before marking a task as complete:

1. **Type Checking**
   ```bash
   pnpm typecheck
   ```
   Must pass with no errors.

2. **Linting**
   ```bash
   pnpm lint
   ```
   Check for any linting issues. If there are fixable issues, run:
   ```bash
   pnpm lint:fix
   ```

## Additional Commands for Documentation Tasks

If working on markdown documentation files:
```bash
pnpm textlint         # Check markdown files
pnpm textlint:fix     # Auto-fix markdown issues
```

## Important Notes
- These commands are NON-NEGOTIABLE - always run them
- If `pnpm typecheck` or `pnpm lint` fail, the task is NOT complete
- Fix all issues before considering the task done
- The CLAUDE.md file explicitly states: "ALWAYS run these before considering tasks complete"