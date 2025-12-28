# /create-component-abstraction - Component Abstraction Creation and Management

Create new reusable component abstractions following established project patterns and best practices.

## What this command does:

### Pre-Creation Validation Process

#### Phase 1: Existing Components Review

- **Project Component Existence Verification**: Confirm if a desired component or similar abstraction already exists within `shared/lib/`.
- **Integration Guide Review**: Study existing implementation patterns and best practices within `shared/lib/`.
- **Component Capabilities Assessment**: Understand features and limitations of existing components.

#### Phase 2: Project Abstraction Analysis

- **Existing Abstractions Review**: Check `shared/lib/` for duplications or similar functionalities.
- **Pattern Study**: Analyze existing abstractions for structure and implementation consistency.
- **Naming Convention Validation**: Ensure naming follows project standards.
- **Reusability Assessment**: Evaluate potential for component reuse across features.

### Component Creation Workflow

#### Phase 3: New Component Creation (When Needed)

**Only when a component doesn't exist in `shared/lib/` or project abstractions:**

1. **Documentation Review**: Verify component truly doesn't exist or isn't suitable.
2. **Approval Process**: Notify developer about new component creation.
3. **Design System Alignment**: Ensure new component follows the project's design principles.
4. **Implementation Standards**: Follow established project patterns.

#### Phase 4: Component Abstraction Creation

**Primary workflow for creating new component abstractions in `shared/lib/`:**

1. **Directory Structure Creation**

   ```
   shared/lib/[ComponentName]/
   ├── index.tsx                    // Main component file
   ├── [ComponentName].spec.tsx     // Test file
   ├── [ComponentName].scss         // Styles (if needed)
   └── index.ts                     // Barrel export
   ```

2. **Component Implementation**
   - **Existing Component Type Extension**: Extend base component props from existing internal components (if applicable).
   - **Custom Props Addition**: Add project-specific customization properties.
   - **Generic Reusability**: Design for maximum reusability across features.
   - **Type Safety**: Implement proper TypeScript interfaces.

### Abstraction Best Practices

#### Props Design Strategy

```typescript
// ✅ Proper existing component inheritance (example extending a hypothetical BaseButtonProps)
import type { BaseButtonProps } from '../_common/common.types'

export interface CustomButtonProps extends BaseButtonProps {
  customVariant?: 'primary' | 'secondary'
  customSize?: 'small' | 'large'
  // Only add props that modify default behavior
}

export default function CustomButton(props: CustomButtonProps) {
  const { customVariant, customSize, ...baseProps } = props
  // Custom logic for abstraction
  return <button {...baseProps} /> // Using a generic button element as an example
}
```

#### Customization Guidelines

- **Reuse Existing Props**: Inherit all base component properties from internal components.
- **Selective Additions**: Only add props that enhance default behavior.
- **Generic Design**: Create abstractions usable across multiple features.
- **Type Safety**: Maintain strong TypeScript typing throughout.

#### Component Structure Standards

- **File Organization**: Follow established directory structure in `shared/lib/`.
- **Export Strategy**: Use barrel exports for clean imports.
- **Documentation**: Include JSDoc comments for complex abstractions.
- **Testing**: Comprehensive test coverage for custom functionality.

### Quality Assurance Process

#### Code Review Checklist

- **Project Standards Compliance**: Follows established project patterns and guidelines.
- **Type Safety**: Proper TypeScript implementation.
- **Reusability**: Generic enough for multiple use cases.
- **Test Coverage**: Comprehensive test implementation.

#### Integration Validation

- **Build Success**: Component compiles without errors.
- **Style Integration**: Styles properly integrated.
- **Type Checking**: TypeScript validation passes.
- **Test Coverage**: All functionality tested appropriately.

## Usage:

Type `/create-component-abstraction` in the chat when you need to create a new reusable component abstraction.

## Creation Scenarios:

### New Abstraction (Most Common)

- A functionality needs a project-specific abstraction.
- Requires customization beyond basic JSX elements.
- Needs consistent usage pattern across features.

### New Component (Rare)

- A component doesn't exist in the project and is a net new functionality.
- Requires approval and documentation.
- Must follow project design principles.

### Component Enhancement

- Existing abstraction needs additional functionality.
- Type safety improvements needed.
- Performance or usability enhancements.

## Key Features:

- ✅ **Documentation First** - validates against existing project documentation.
- ✅ **Duplication Prevention** - checks existing project abstractions in `shared/lib/`.
- ✅ **Pattern Consistency** - follows established project structure.
- ✅ **Type Safety** - proper TypeScript interface extension.
- ✅ **Generic Design** - maximum reusability across features.
- ✅ **Quality Standards** - comprehensive testing and validation.

## Expected Output:

1. **Validation Report**: Existing component and project abstraction review.
2. **Component Creation**: New abstraction with proper structure.
3. **Type Implementation**: TypeScript interfaces with existing type extension.
4. **Test Coverage**: Comprehensive test suite for custom functionality.
5. **Integration Guide**: Usage examples and implementation notes.
6. **Documentation**: Component purpose and customization options.

## Design Principles:

- **Reuse First**: Leverage existing components in `shared/lib/` whenever possible.
- **Minimal Abstraction**: Only abstract when adding genuine value.
- **Type Extension**: Always extend existing component props (if applicable).
- **Generic Reusability**: Design for multiple use cases.
- **Consistency**: Follow established project patterns.
- **Quality**: Comprehensive testing and documentation.
