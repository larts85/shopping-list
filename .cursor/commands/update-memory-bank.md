# /update-memory-bank - Comprehensive Memory Bank Update

Update and maintain the Memory Bank documentation system to ensure accurate project context and knowledge preservation.

## What this command does:

### Complete Memory Bank Review Process

**MANDATORY**: Reviews ALL Memory Bank files, even if some don't require updates

1. **Core Files Assessment**
   - `projectbrief.md` - Foundation document validation
   - `productContext.md` - Problem-solution alignment check
   - `activeContext.md` - Current work focus update (**Priority**)
   - `systemPatterns.md` - Architecture and design patterns review
   - `techContext.md` - Technology stack and constraints validation
   - `progress.md` - Current status and achievements (**Priority**)

2. **Additional Context Files**
   - Feature documentation updates
   - Integration specifications refresh
   - API documentation alignment
   - Testing strategy updates
   - Deployment procedure validation

### Update Trigger Conditions

This process activates when:

- User explicitly requests "update memory bank"
- After implementing significant changes
- When discovering new project patterns
- When context needs clarification
- During major milestones or phase completions

### Documentation Update Process

#### Phase 1: Current State Analysis

- **Review ALL Files**: Systematic examination of every memory bank file
- **Identify Gaps**: Missing information or outdated content
- **Context Validation**: Ensure documentation reflects current reality
- **Pattern Discovery**: New architectural or implementation patterns

#### Phase 2: Content Updates

- **activeContext.md Priority**: Current work focus, recent changes, next steps
- **progress.md Priority**: What works, what's left to build, current status
- **System Updates**: Architecture changes, new patterns, technical decisions
- **Product Updates**: Feature evolution, user experience improvements

#### Phase 3: Knowledge Integration

- **Cross-Reference Updates**: Ensure consistency across all files
- **Pattern Documentation**: Capture new project insights
- **Decision Recording**: Document important architectural choices
- **Learning Capture**: Preserve problem-solving approaches

#### Phase 4: .cursorrules Enhancement

- **Pattern Updates**: Add newly discovered project patterns
- **Preference Recording**: Document user workflow preferences
- **Challenge Documentation**: Record known issues and solutions
- **Tool Usage Patterns**: Capture effective development approaches

### Memory Bank Structure Maintenance

```
memory-bank/
├── projectbrief.md        (Foundation - shapes all others)
├── productContext.md      (Why this exists, problems solved)
├── activeContext.md       (Current focus - PRIORITY)
├── systemPatterns.md      (Architecture, key decisions)
├── techContext.md         (Technologies, setup, constraints)
├── progress.md            (Status, achievements - PRIORITY)
└── [additional-contexts]/ (Feature docs, specs, procedures)
```

### Update Quality Standards

- **Accuracy**: Documentation reflects current project state
- **Completeness**: No critical knowledge gaps remain
- **Clarity**: Clear, actionable information for future reference
- **Relevance**: Focus on information that aids development
- **Consistency**: Aligned information across all files

## Usage:

Type `/update-memory-bank` in the chat when you need to refresh project documentation after significant changes or milestones.

## Best Use Cases:

- **After Major Features**: Document new patterns and architectural decisions
- **Phase Completions**: Update progress and shift active context
- **Architecture Changes**: Capture system evolution and new patterns
- **Problem Resolution**: Document solutions for future reference
- **Team Handoffs**: Ensure knowledge is preserved and accessible
- **Project Milestones**: Update achievements and remaining work

## Key Features:

- ✅ **Comprehensive Review** - examines ALL memory bank files
- ✅ **Priority Focus** - emphasizes activeContext.md and progress.md
- ✅ **Pattern Capture** - documents new project insights
- ✅ **Knowledge Preservation** - prevents information loss between sessions
- ✅ **Cross-Reference Validation** - ensures consistency across files
- ✅ **Future Preparation** - optimizes for post-reset effectiveness

## Expected Output:

1. **File Review Summary**: Status of each memory bank file
2. **Update Identification**: What needs to be updated and why
3. **Content Updates**: Actual file modifications with new information
4. **Pattern Documentation**: New insights captured in .cursorrules
5. **Validation Report**: Confirmation of update completeness
6. **Next Steps**: Clear guidance for continued development

## Update Principles:

- **Complete Coverage**: Review every file, update what's needed
- **Current Focus**: Prioritize activeContext.md and progress.md
- **Knowledge Preservation**: Capture insights that aid future work
- **Accuracy First**: Ensure documentation reflects reality
- **Future Utility**: Optimize for effectiveness after memory reset

## Critical Note:

This is essential for maintaining project continuity across Cursor sessions. The Memory Bank is the only persistent knowledge source after memory resets, making its accuracy and completeness crucial for effective continued development.
