# /review-frontend - Comprehensive Frontend Code Review

Perform an expert-level frontend code review following established best practices and quality standards.

## What this command does:

### Comprehensive Code Analysis

1. **Git Status and Changes Review**
   - Checks current branch with `git branch --show-current`
   - Analyzes changes with `git diff origin/develop` (or origin/master if develop doesn't exist)
   - Identifies modified, added, and deleted files
   - Maps scope of changes across the codebase

2. **Code Quality Assessment**
   - **Readability**: Meaningful variable and function names
   - **Error Handling**: Proper handling of asynchronous operations and edge cases
   - **Performance**: Identifies bottlenecks and suggests optimizations
   - **Architecture**: Adherence to Single Responsibility Principle
   - **State Management**: Proper usage patterns and avoiding prop drilling

3. **TypeScript Best Practices Review**
   - Ensures all functions and methods are properly typed
   - Reviews type definitions for consistency and correctness
   - Validates external data handling with proper types
   - Discourages `any` type usage and suggests specific alternatives
   - Confirms no duplicate types exist

4. **Testing Requirements Validation**
   - Verifies new functionality has corresponding unit and integration tests
   - Ensures tests cover edge cases and error scenarios
   - Confirms minimum 100% coverage for changes without significant gaps
   - Reviews test quality and effectiveness

5. **Project Standards Compliance**
   - Validates file and folder organization according to project structure
   - Checks component modularity and reusability
   - Ensures proper usage of Andes components and abstractions
   - Verifies adherence to established patterns and conventions

### Code Quality Checks

- **Dead Code Detection**: Identifies and flags commented-out code blocks
- **Unused Code Cleanup**: Finds unused variables, functions, imports, and unreferenced code
- **Import Analysis**: Detects code not imported anywhere in the project
- **Dependency Validation**: Ensures all imports have corresponding implementations

### Improvement Generation

- **Error Detection**: Identifies specific issues requiring fixes
- **Code Generation**: Provides corrected code for identified problems
- **Optimization Suggestions**: Recommends performance and maintainability improvements
- **Best Practice Enforcement**: Suggests alignment with established patterns

## Usage:

Type `/review-frontend` in the chat to execute a comprehensive frontend code review.

## Review Focus Areas:

### General Implementation

- Code readability and maintainability
- Error handling completeness
- Performance optimization opportunities
- Architectural consistency

### TypeScript Quality

- Type safety and correctness
- Interface design and reusability
- Generic usage and constraint handling
- Type inference optimization

### Testing Standards

- Coverage completeness and quality
- Test case comprehensiveness
- Mock usage and test isolation
- Integration test effectiveness

### Project Compliance

- File organization and naming conventions
- Component design and modularity
- Dependency management
- Documentation completeness

## Key Features:

- ✅ **Expert-Level Analysis** - professional code review standards
- ✅ **Multi-Faceted Review** - covers code quality, types, tests, and architecture
- ✅ **Actionable Feedback** - specific improvements with code examples
- ✅ **Standards Enforcement** - ensures project convention compliance
- ✅ **Dead Code Detection** - identifies cleanup opportunities
- ✅ **Performance Focus** - optimization recommendations
- ✅ **TypeScript Excellence** - advanced type system usage

## Expected Output:

1. **Change Analysis**: Overview of modified files and scope
2. **Quality Assessment**: Detailed review of code quality aspects
3. **Issue Identification**: Specific problems found with severity levels
4. **Improvement Recommendations**: Concrete suggestions with code examples
5. **Standards Compliance**: Verification against project conventions
6. **Action Items**: Prioritized list of improvements to implement

## Review Principles:

- **Focus on Improvement**: Only comment on errors and opportunities
- **Provide Solutions**: Generate corrected code for identified issues
- **Maintain Standards**: Enforce established project patterns
- **Performance Minded**: Identify optimization opportunities
- **Type Safety First**: Ensure robust TypeScript usage
