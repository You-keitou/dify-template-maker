# Validation Architecture

## Overview
The Dify Template Maker uses a modular validation system with specialized validators that implement a common interface. Each validator focuses on a specific aspect of template validation.

## Validator Interface
All validators implement the `Validator` interface from `src/mastra/tools/validators/types.ts`:

```typescript
interface Validator {
  validate(dsl: any): ValidationResult;
  fix?(dsl: any): any;  // Optional auto-fix capability
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}
```

## Available Validators

### 1. SchemaValidator
- **Purpose**: Validates DSL structure against Dify schema
- **Location**: `src/mastra/tools/validators/schema.ts`
- **Checks**: Required fields, data types, structure compliance

### 2. SecurityValidator  
- **Purpose**: Checks for security vulnerabilities
- **Location**: `src/mastra/tools/validators/security.ts`
- **Checks**: Input validation, API key exposure, injection risks

### 3. PerformanceValidator
- **Purpose**: Analyzes performance implications
- **Location**: `src/mastra/tools/validators/performance.ts`
- **Checks**: Loop efficiency, data processing, resource usage

### 4. LogicValidator
- **Purpose**: Validates workflow logic and flow
- **Location**: `src/mastra/tools/validators/logic.ts`
- **Checks**: Node connections, data flow, conditional logic

## Validator Chain
Validators are executed in sequence in `src/mastra/tools/dsl-validation-tool.ts`. The validation process:
1. Runs each validator in order
2. Collects all errors and warnings
3. Returns aggregated results
4. Optionally applies fixes if requested

## Adding New Validators
1. Create new file in `src/mastra/tools/validators/`
2. Implement the `Validator` interface
3. Export from `src/mastra/tools/validators/index.ts`
4. Add to validator chain in validation tool