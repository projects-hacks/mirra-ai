# MCP-Driven Development Workflow

## Overview

This guide establishes a comprehensive workflow that leverages all available MCP servers to improve code quality, security, and development speed.

## Available MCP Servers

### 1. **Snyk MCP** - Security & Vulnerability Scanning
- **Purpose**: Identify security vulnerabilities and license issues
- **When to use**: Before every commit, during code review
- **Key tools**:
  - `snyk_code_scan` - SAST (Static Application Security Testing)
  - `snyk_sca_scan` - Dependency vulnerability scanning
  - `snyk_container_scan` - Container image scanning
  - `snyk_iac_scan` - Infrastructure as Code scanning

### 2. **SonarQube MCP** - Code Quality Analysis
- **Purpose**: Track code quality, technical debt, code smells
- **When to use**: Before merge, during refactoring
- **Key tools**:
  - `search_sonar_issues_in_projects` - Find bugs, vulnerabilities, code smells
  - `get_project_quality_gate_status` - Check if quality gate passes
  - `search_files_by_coverage` - Identify files needing tests

### 3. **Context7 MCP** - API Documentation Lookup
- **Purpose**: Get up-to-date documentation and code examples
- **When to use**: Learning new APIs, troubleshooting integration issues
- **Key tools**:
  - `resolve_library_id` - Find library ID for documentation
  - `query_docs` - Query documentation with natural language

### 4. **Exa MCP** - Web Search & Research
- **Purpose**: Find current information, best practices, solutions
- **When to use**: Researching solutions, finding latest versions
- **Key tools**:
  - `web_search_exa` - Semantic search for technical content
  - `web_fetch_exa` - Fetch full content from URLs

### 5. **Sequential Thinking MCP** - Complex Problem Solving
- **Purpose**: Break down complex problems, validate solutions
- **When to use**: Multi-step problems, architectural decisions
- **Key tools**:
  - `sequentialthinking` - Step-by-step problem analysis

### 6. **Memory MCP** - Project Knowledge Management
- **Purpose**: Track decisions, progress, and project knowledge
- **When to use**: After completing features, making decisions
- **Key tools**:
  - `create_entities` - Store project information
  - `create_relations` - Link related information
  - `read_graph` - Retrieve project knowledge

## Workflow Integration

### Pre-Commit Workflow

```bash
# 1. Security Scan (Snyk)
snyk_code_scan path=/absolute/path/to/modified/files
snyk_sca_scan path=/absolute/path/to/backend

# 2. Code Quality Check (SonarQube)
search_sonar_issues_in_projects 
  projects=["mirra-ai"]
  severities=["HIGH", "BLOCKER"]
  issueStatuses=["OPEN"]

# 3. Fix Issues
# - Address critical/high severity issues
# - Refactor code smells if time permits

# 4. Update Memory
create_entities with completed work
```

### Development Workflow

```bash
# 1. Research Phase
# Use Context7 for API docs
resolve_library_id libraryName="Perfect Corp" query="face detection API"
query_docs libraryId="/perfectcorp/api" query="How to use face detection?"

# Use Exa for web research
web_search_exa query="Perfect Corp Camera Kit best practices"

# 2. Problem Solving Phase
# Use Sequential Thinking for complex problems
sequentialthinking 
  thought="Breaking down the Camera Kit integration..."
  thoughtNumber=1
  totalThoughts=5

# 3. Implementation Phase
# Write code with insights from research

# 4. Quality Check Phase
# Run Snyk + SonarQube scans

# 5. Documentation Phase
# Update Memory with decisions and progress
create_entities with implementation details
create_relations to link related work
```

### Code Review Workflow

```bash
# 1. Security Review
snyk_code_scan path=/absolute/path/to/changed/files

# 2. Quality Review
search_sonar_issues_in_projects
  files=["changed/file1.tsx", "changed/file2.py"]
  severities=["HIGH", "BLOCKER"]

# 3. Coverage Review
search_files_by_coverage projectKey="mirra-ai" maxCoverage=80

# 4. Decision Documentation
create_entities with review findings
```

## Current Project Status (from Memory)

### ✅ Completed Milestones
1. **Onboarding Flow Phase 1** - Auth, camera, selfie capture
2. **Onboarding Flow Phase 2** - Appearance analysis with Perfect Corp
3. **Perfect Corp Camera Kit Integration** - Real-time validation
4. **Frontend Optimizations** - Performance, mobile responsiveness
5. **Backend Refactoring** - DRY principle, utility modules
6. **Feature Discoverability UI** - Menu system, parameter modals

### 🚧 In Progress
- **Onboarding Flow Phase 3** (40% complete)
  - ✅ Calendar prompt UI
  - ✅ Closet seeding
  - ❌ Calendar OAuth flow
  - ❌ Completion screen

### ❌ Not Started
- **Phase 4**: Profile & Auth Management
- **Phase 5**: Context Persistence
- **Phase 6**: Scalability & Performance
- **Phase 7**: Testing & Documentation

### ⚠️ Technical Debt
- **MCP Server Usage Gap**: Not using Snyk, SonarQube, Context7, Exa consistently
- **Property-Based Testing**: 15+ optional property tests not implemented
- **Calendar Integration**: OAuth flow incomplete
- **Token Refresh**: Automatic token refresh not implemented

## Action Items

### Immediate (This Week)
1. ✅ **Integrate Camera Kit SDK** - DONE
2. ✅ **Fix Perfect Corp API format** - DONE
3. ✅ **Update Memory with progress** - DONE
4. 🔄 **Run Snyk scan on recent changes** - TODO
5. 🔄 **Run SonarQube quality check** - TODO

### Short Term (Next 2 Weeks)
1. Complete Phase 3 (Calendar OAuth, Completion screen)
2. Implement Phase 4 (Token refresh, session validation)
3. Set up automated Snyk/SonarQube scans in CI/CD
4. Write property-based tests with fast-check

### Long Term (Next Month)
1. Complete Phase 5 (Context persistence)
2. Complete Phase 6 (Scalability)
3. Complete Phase 7 (Testing & documentation)
4. Establish MCP-driven development as standard practice

## Best Practices

### 1. Security First
- **Always** run Snyk scan before committing
- Fix critical/high severity issues immediately
- Document security decisions in Memory

### 2. Quality Gates
- **Always** check SonarQube quality gate before merge
- Address blocker issues immediately
- Track technical debt for future sprints

### 3. Research Before Implementation
- Use Context7 for API documentation
- Use Exa for best practices and solutions
- Document findings in Memory

### 4. Complex Problem Solving
- Use Sequential Thinking for multi-step problems
- Break down problems into manageable pieces
- Validate solutions before implementation

### 5. Knowledge Management
- Update Memory after completing features
- Document decisions and rationale
- Link related work with relations

## Example: Perfect Corp Integration (What We Should Have Done)

### ❌ What We Did (Manual)
1. Manually read Perfect Corp docs from user-provided text
2. Manually analyzed API requirements
3. Manually implemented fixes
4. Manually tested changes
5. Manually documented in markdown

### ✅ What We Should Do (MCP-Driven)
```bash
# 1. Research with Context7
resolve_library_id 
  libraryName="Perfect Corp" 
  query="Camera Kit SDK integration"

query_docs 
  libraryId="/perfectcorp/camera-kit"
  query="How to integrate Camera Kit SDK with React?"

# 2. Web research with Exa
web_search_exa 
  query="Perfect Corp Camera Kit best practices React TypeScript"

# 3. Problem solving with Sequential Thinking
sequentialthinking
  thought="Analyzing Camera Kit integration requirements..."
  thoughtNumber=1
  totalThoughts=10

# 4. Implementation
# Write code based on research

# 5. Security scan with Snyk
snyk_code_scan 
  path="/absolute/path/to/frontend/src/hooks/useCameraKit.ts"

snyk_code_scan
  path="/absolute/path/to/backend/app/services/perfectcorp.py"

# 6. Quality check with SonarQube
search_sonar_issues_in_projects
  projects=["mirra-ai"]
  files=["frontend/src/hooks/useCameraKit.ts"]
  severities=["HIGH", "BLOCKER"]

# 7. Document in Memory
create_entities with:
  - Integration details
  - Decisions made
  - Issues encountered
  - Solutions implemented

create_relations to link:
  - Camera Kit → Onboarding Flow
  - Perfect Corp API → Backend Services
```

## Benefits of MCP-Driven Workflow

### Speed
- ⚡ Faster research with Context7 and Exa
- ⚡ Automated security/quality checks
- ⚡ Reduced debugging time

### Quality
- ✅ Fewer security vulnerabilities
- ✅ Better code quality
- ✅ Comprehensive documentation

### Knowledge
- 📚 Centralized project knowledge in Memory
- 📚 Documented decisions and rationale
- 📚 Easy onboarding for new developers

### Confidence
- 💪 Validated solutions before implementation
- 💪 Automated quality gates
- 💪 Comprehensive test coverage

## Next Steps

1. **Run Snyk scan** on recent Perfect Corp changes
2. **Run SonarQube analysis** on entire project
3. **Document findings** in Memory
4. **Create CI/CD integration** for automated scans
5. **Establish MCP workflow** as team standard

## Conclusion

By leveraging all available MCP servers, we can:
- Develop faster with better research tools
- Ship more secure code with automated scanning
- Maintain higher quality with continuous analysis
- Build comprehensive knowledge base with Memory
- Solve complex problems systematically with Sequential Thinking

**The key is to make MCP servers part of our daily workflow, not just occasional tools.**
