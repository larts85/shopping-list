# /test-coverage - Comprehensive Test Coverage Analysis and Enhancement

Analyze and improve test coverage to achieve 100% coverage standards with meaningful test quality.

## What this command does:

### Test Coverage Analysis Process

#### Phase 1: Current Coverage Assessment

- **Run Coverage Analysis**: Execute `npm run test:coverage` for specific files
- **Identify Gaps**: Systematically locate uncovered lines, branches, and functions
- **Coverage Report Review**: Analyze statements, branches, functions, and lines coverage
- **Quality Assessment**: Evaluate existing test effectiveness and completeness

#### Phase 2: Gap Analysis and Planning

- **Uncovered Code Mapping**: Catalog every uncovered code path
- **Edge Case Identification**: Find untested scenarios and boundary conditions
- **Component State Analysis**: Identify missing state variation tests
- **Integration Gap Detection**: Locate untested component interactions

#### Phase 3: Targeted Test Creation

Creates comprehensive tests for:

- **Component State Variations**: Loading, empty, error, disabled states
- **User Interaction Patterns**: Clicks, inputs, form submissions, navigation
- **Code Path Coverage**: Early returns, conditional logic, switch statements
- **Function Parameter Variations**: Required vs optional, edge values, type validation
- **Error Handling**: Exception scenarios, invalid inputs, network failures
- **Cleanup Operations**: Component unmounts, effect cleanups, memory management

### Coverage Enhancement Strategy

#### React Components Testing

- **Conditional Rendering**: All possible render paths
- **Event Handlers**: User interactions and their effects
- **Props Variations**: Different prop combinations and edge cases
- **State Changes**: All possible state transitions
- **Lifecycle Effects**: Mount, update, unmount scenarios

#### Function Logic Testing

- **Early Returns**: Test all exit conditions
- **Branch Coverage**: Every if/else and switch case
- **Error Conditions**: Exception handling and validation
- **Parameter Edge Cases**: Null, undefined, empty values

#### Integration Testing

- **Component Interactions**: Parent-child communication
- **Service Integration**: API calls and data flow
- **State Management**: Store updates and subscriptions
- **Error Propagation**: How errors bubble through components

### Test Quality Standards

#### High-Quality Coverage Tests

- **Real User Scenarios**: Test actual user workflows, not just code execution
- **Meaningful Assertions**: Verify behavior and state changes, not just presence
- **Error Condition Testing**: Comprehensive edge case and failure scenario coverage
- **Integration Validation**: Test component relationships and data flow

#### Coverage Anti-Patterns to Avoid

- **Execution-Only Tests**: Tests that run code without assertions
- **Shallow Testing**: Surface-level tests that don't verify behavior
- **Over-Mocking**: Eliminating real logic testing through excessive mocking
- **Coverage Gaming**: Tests written solely to increase percentage metrics

### Project-Specific Test Utilities Integration

- **renderWithProvider**: Use for all component tests with proper typing
- **renderHookWithProvider**: Use for hook tests with correct overloads
- **checkSelectorAsync**: Consistent selector verification patterns
- **setAndCheckSelectorAsync**: Complex selector interaction testing

## Usage:

Type `/test-coverage` in the chat to analyze and enhance test coverage for specific files or the entire project.

## Coverage Standards:

- **Target**: 100% coverage for new components and significant changes
- **Minimum**: 95% coverage for statements, branches, functions, and lines
- **Quality**: Meaningful tests that verify actual behavior
- **Documentation**: Intentionally uncovered code must be justified

## Key Features:

- ✅ **Systematic Analysis** - comprehensive coverage gap identification
- ✅ **Quality Focus** - meaningful tests over percentage gaming
- ✅ **Edge Case Strategy** - comprehensive boundary condition testing
- ✅ **Project Integration** - uses established test utilities and patterns
- ✅ **Real Scenarios** - tests actual user workflows
- ✅ **Error Handling** - comprehensive failure scenario coverage

## Expected Output:

1. **Coverage Report**: Current coverage statistics and identified gaps
2. **Gap Analysis**: Detailed breakdown of uncovered code paths
3. **Test Strategy**: Plan for achieving comprehensive coverage
4. **Test Implementation**: Creation of targeted tests for uncovered areas
5. **Quality Validation**: Verification that tests are meaningful and effective
6. **Coverage Verification**: Confirmation of improved coverage metrics

## Coverage Analysis Workflow:

1. **Initial Assessment**: Review current test coverage status
2. **Gap Identification**: Catalog uncovered lines and branches systematically
3. **Test Planning**: Design targeted tests for each gap
4. **Implementation**: Create high-quality tests with proper assertions
5. **Verification**: Confirm coverage improvements and test quality
6. **Documentation**: Record any intentionally uncovered code paths

## Best Use Cases:

- **New Feature Development**: Ensure comprehensive test coverage from start
- **Legacy Code Enhancement**: Add missing tests to existing components
- **Refactoring Support**: Maintain test coverage during code changes
- **Quality Assurance**: Validate test effectiveness and coverage completeness
- **CI/CD Integration**: Maintain coverage standards in deployment pipeline

## Testing Principles:

- **Behavior Over Execution**: Test what code does, not just that it runs
- **User-Centric**: Focus on real user scenarios and workflows
- **Comprehensive**: Cover all code paths, states, and interactions
- **Quality First**: Meaningful tests that provide real value
- **Maintainable**: Tests that are easy to understand and update
