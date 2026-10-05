# RAPTOR PROMPT: Audit My Claude Code Project for Bloat, Context Waste, and Usage Efficiency

## ROLE

You are a senior software architect, codebase auditor, developer-productivity engineer, and Claude Code optimization specialist.

You have deep expertise in:

- Software architecture and repository organization
- Identifying unnecessary code, dead code, abandoned experiments, duplicate implementations, and dependency bloat
- Distinguishing legitimate project complexity from accidental complexity
- Refactoring AI-generated codebases safely
- Claude Code context management and token/usage optimization
- `CLAUDE.md` design and project memory
- Claude Code configuration
- MCP servers and tool/context overhead
- Claude Code skills, agents, hooks, commands, permissions, and settings
- Context-window management
- Efficient prompting strategies for agentic coding
- Model selection and routing
- Repository navigation strategies for LLM coding agents
- Designing projects so an AI agent can understand the minimum amount of code necessary for each task

Act as both:

1. **A software engineer auditing the repository itself**, and
2. **An AI-efficiency engineer auditing how Claude interacts with the repository.**

These are related but distinct problems.

Do not assume that a large project is inherently inefficient.

Do not assume that reducing line count automatically reduces Claude usage.

Do not make recommendations based on vague ideas such as "clean code is more token efficient." Investigate the actual mechanisms that affect Claude Code context and usage.

---

# AIM

I built this codebase primarily through Claude Code while experimenting and learning what Claude could do.

Because of that, I am concerned that:

- Claude may have created unnecessary files or code.
- Multiple experimental approaches may still exist.
- There may be abandoned or duplicate implementations.
- Dependencies may have accumulated unnecessarily.
- Documentation or AI instructions may have become bloated.
- Claude may be reading more context than it needs.
- My Claude Code configuration may introduce unnecessary context.
- My workflow may cause Claude to repeatedly process information it doesn't need.
- Long sessions may be consuming far more usage than necessary.
- The repository may not be structured optimally for AI-assisted development.
- I may upgrade to Claude Max 5x but still waste the additional usage through inefficient practices.

Your goal is to perform a comprehensive **Claude Code Efficiency Audit** of this repository and then give me a practical optimization plan.

I want to answer four high-level questions:

### 1. Is my codebase actually bloated?

Determine whether there is meaningful technical bloat, unnecessary complexity, duplicate code, dead code, unnecessary dependencies, abandoned experiments, excessive generated material, or structural problems.

### 2. Is my project bloated specifically from Claude Code's perspective?

Determine whether Claude is likely to consume unnecessary context because of repository structure, instructions, configuration, huge files, automatically loaded context, tool definitions, memory, or other factors.

### 3. Am I using Claude Code inefficiently?

Determine what parts of my day-to-day workflow could unnecessarily consume my Claude usage limits.

### 4. Would upgrading to Max 5x actually solve my problem?

Separate:

- insufficient Claude allowance,
- inefficient Claude usage,
- inefficient project structure,
- and normal usage for the type of work I'm doing.

Help me determine whether I should optimize first, upgrade first, or do both.

---

# PARAMETERS

## PHASE 1 — INVESTIGATE BEFORE CHANGING ANYTHING

Start in **audit/read-only mode**.

Do NOT:

- delete files,
- refactor code,
- uninstall dependencies,
- rewrite configuration,
- modify `CLAUDE.md`,
- restructure folders,
- or make commits

during the initial audit.

First investigate and report your findings.

I want evidence before changes.

If you identify something that looks unnecessary, verify how it is used before labeling it bloat.

Distinguish clearly between:

- confirmed bloat,
- probable bloat,
- possible bloat,
- intentional complexity,
- and unknown/needs investigation.

---

# PHASE 2 — MAP THE PROJECT

Before evaluating individual files, develop a high-level understanding of the application.

Identify:

- What the application does
- Major features
- Major architectural components
- Languages/frameworks
- Entry points
- Frontend/backend boundaries
- External services
- Databases
- Build system
- Testing infrastructure
- Major dependencies
- Deployment infrastructure
- Generated assets
- Documentation
- Development utilities
- Claude-specific configuration

Create a concise architecture map.

Do NOT read every file indiscriminately if repository navigation, dependency analysis, search, or targeted inspection can answer the question more efficiently.

Part of this exercise is demonstrating an efficient way to inspect the repository.

---

# PHASE 3 — AUDIT NORMAL CODEBASE BLOAT

Investigate the repository for the following.

## A. Dead or abandoned code

Look for:

- Unreferenced components
- Unused modules
- Unused utility functions
- Old implementations
- Commented-out implementations
- Deprecated code paths
- Experimental features
- Temporary proof-of-concept code
- Orphaned files
- Unused API endpoints
- Old scripts
- Old migrations when genuinely unnecessary
- Duplicate versions of features

Do not classify something as dead merely because simple text search finds no import if the framework can load it dynamically.

---

## B. Duplicate functionality

Look for multiple implementations of the same concept.

Examples:

- Several utilities performing nearly identical jobs
- Duplicate API clients
- Multiple state-management approaches
- Multiple authentication implementations
- Repeated validation logic
- Similar components that could reasonably share behavior
- AI-generated alternate implementations that were never removed

Identify whether consolidation would actually improve maintainability.

---

## C. Dependency bloat

Inspect package/dependency manifests.

Classify dependencies as:

- clearly required,
- likely required,
- development-only,
- redundant,
- overlapping,
- possibly unused,
- apparently unused.

Check whether multiple libraries solve the same problem.

Do NOT recommend replacing a working dependency solely to reduce dependency count unless there is a meaningful benefit.

---

## D. File and directory bloat

Identify:

- Generated files
- Build outputs
- Logs
- caches
- temporary data
- exported reports
- backups
- test artifacts
- large fixtures
- binary assets
- minified files
- snapshots
- vendored dependencies
- package-manager artifacts
- accidental copies
- archive files

Determine whether they should:

- remain in the repository,
- be ignored,
- be moved,
- or be removed.

Pay particular attention to files that Claude might accidentally inspect even though they are not useful source context.

---

## E. Architectural overengineering

Look for complexity that may have resulted from AI experimentation, such as:

- abstraction layers used only once,
- excessive wrapper functions,
- premature plugin systems,
- unnecessary factories,
- excessive interfaces,
- unnecessary configuration layers,
- overly generic helpers,
- fragmented modules,
- excessive micro-files,
- excessive indirection,
- design patterns without a practical need.

Do NOT equate abstraction with bloat automatically.

Explain the tradeoff for each significant finding.

---

# PHASE 4 — AUDIT CLAUDE-SPECIFIC CONTEXT BLOAT

This is extremely important.

Inspect every Claude Code configuration or instruction source available to this project.

Look for relevant files/settings such as:

- repository `CLAUDE.md`
- nested `CLAUDE.md` files
- user-level `~/.claude/CLAUDE.md`, if accessible
- `.claude/`
- project settings
- local settings
- skills
- commands
- agents/subagents
- hooks
- permissions
- MCP configuration
- project memory / auto-memory where accessible
- plugin configuration
- other Claude-related project files

Determine what Claude is being instructed to load or consider automatically.

For each source, tell me:

1. What it does
2. Whether it adds context
3. Whether the information is necessary
4. Whether it duplicates instructions elsewhere
5. Whether it is too verbose
6. Whether it contains stale instructions
7. Whether it should be shortened, moved, split, or removed
8. Whether more specific/contextual instructions should replace global instructions

---

# CLAUDE.MD AUDIT

Give special attention to `CLAUDE.md`.

Evaluate whether it contains:

- Information Claude could easily discover itself
- Long architecture explanations
- Repeated instructions
- Obvious coding conventions
- Temporary project information
- Stale instructions
- Examples that consume unnecessary context
- Rules that could be enforced by tooling instead
- Documentation that belongs elsewhere
- Information needed only for specific directories
- Information needed for every task

Classify every major section as:

**KEEP IN ROOT CLAUDE.md**

**MOVE TO NESTED CLAUDE.md**

**MOVE TO NORMAL DOCUMENTATION**

**ENFORCE WITH TOOLING INSTEAD**

**REMOVE**

**SHORTEN**

Then propose an optimized `CLAUDE.md`.

The optimized version should function as a **high-value briefing, not a full project manual**.

Do not modify the file until I approve the recommendation.

---

# PHASE 5 — CONTEXT FOOTPRINT AUDIT

Identify files that could be disproportionately expensive or distracting when Claude reads them.

Examples:

- Huge source files
- Massive JSON
- Generated schemas
- API specifications
- Database dumps
- lockfiles
- snapshots
- long logs
- minified JavaScript
- large fixtures
- generated type files
- giant documentation files
- machine-generated output

For each major example, determine:

- Why Claude might encounter it
- Whether Claude actually needs it
- Whether it can be excluded or avoided
- Whether a smaller source-of-truth file exists
- Whether it should be broken up
- Whether Claude should be explicitly told not to inspect it unless necessary

Do not recommend splitting files solely to reduce their size unless it also makes architectural sense.

---

# PHASE 6 — MCP, TOOLS, SKILLS, AGENTS, AND HOOKS AUDIT

If this project uses MCP servers, plugins, custom skills, agents, hooks, or custom commands, audit them.

For each one determine:

- What it provides
- How often it is useful
- Whether it appears available for every session
- Whether it contributes unnecessary context/tool definitions
- Whether its functionality overlaps with another tool
- Whether it should remain globally enabled
- Whether it could instead be enabled only when needed

Flag anything that appears to impose recurring overhead without providing recurring value.

---

# PHASE 7 — WORKFLOW / USAGE AUDIT

Now evaluate how I should use Claude Code itself.

Explain the practical usage consequences of:

- Long-running sessions
- Switching between unrelated tasks in one conversation
- Letting Claude read many files and then continuing the session indefinitely
- Repeatedly debugging through trial and error
- Asking Claude to perform broad repository searches unnecessarily
- Giant initial prompts
- Repeated context explanations
- Excessive output
- Excessive planning
- Asking Claude to rewrite entire files instead of targeted areas
- Using the strongest model for trivial work
- Running multiple agents unnecessarily
- Allowing open-ended exploration
- Asking Claude to implement before establishing scope

Evaluate how I should use features such as:

- `/clear`
- `/compact`
- `/context`
- `/usage`
- `/model`
- `/memory`
- Plan Mode
- subagents
- targeted `@file` references

If any command or behavior has changed in the current version of Claude Code, rely on current Anthropic documentation rather than assumptions.

---

# MODEL ROUTING STRATEGY

Recommend when I should use the models currently available to my account.

Do not assume model names or pricing if you can inspect the current environment.

Use `/model` availability or current official Anthropic information as the source of truth.

Develop a simple strategy such as:

- Routine changes
- Straightforward debugging
- Repository exploration
- Complex debugging
- Architecture planning
- Large refactors
- Mechanical implementation
- Quick questions

Explain which model class is appropriate for each and WHY.

Optimize for **quality per unit of Claude usage**, not merely minimum token consumption.

A cheaper model that requires five failed attempts may be less efficient than a stronger model that solves the problem once.

---

# PHASE 8 — DETERMINE WHETHER MAX 5X IS WORTH IT

I am considering upgrading to Claude Max 5x.

Analyze this separately from the codebase audit.

If you have web access, verify the **current** official Anthropic information about:

- Pro usage
- Max 5x usage
- Max 20x usage if relevant
- Claude Code inclusion
- reset behavior
- shared usage between Claude and Claude Code
- current pricing

Use official Anthropic sources where possible.

Do not rely on outdated information.

If you cannot see my account's actual usage, say so.

Tell me exactly what I should inspect, for example through `/usage`, `/status`, account usage screens, or other current mechanisms.

If you need output from one of those commands, tell me what to run and how you would interpret the result.

However, **do not stop the repository audit merely because account usage data is unavailable.**

Evaluate whether my problem appears to be primarily:

### A. Usage-capacity problem
My workflow is reasonably efficient but I simply use Claude Code heavily.

### B. Context-efficiency problem
I am wasting substantial usage through oversized or long-lived context.

### C. Codebase-structure problem
The repository causes Claude to perform unnecessary exploration.

### D. Workflow problem
I am using Claude in a way that causes repeated work.

### E. Combination

Then recommend:

- stay on my current plan,
- optimize before upgrading,
- upgrade to Max 5x,
- or consider another strategy.

Do not tell me to upgrade simply because more capacity is convenient.

---

# PHASE 9 — DESIGN AN OPTIMAL CLAUDE CODE WORKFLOW FOR THIS PROJECT

Based specifically on this repository, design a repeatable workflow I can use for future Claude Code sessions.

For example, determine what I should do when I want Claude to:

- fix a bug,
- add a small feature,
- build a large feature,
- refactor something,
- investigate unfamiliar code,
- debug a failing test,
- make UI changes,
- perform architecture work.

Create a workflow that minimizes unnecessary context while maintaining high-quality results.

Include guidance for:

### Starting a task
What should my first prompt contain?

### Scoping
How should Claude determine what files are relevant?

### Planning
When should I use Plan Mode?

### Execution
How narrowly should implementation be scoped?

### Verification
How should Claude verify completion?

### Ending a task
When should I clear the session?

### Continuing a long task
When should I compact instead?

---

# PHASE 10 — PROMPT EFFICIENCY

Create reusable prompt templates that are concise but give Claude enough information to work effectively.

Create templates for:

1. Small bug fix
2. Feature implementation
3. Codebase investigation
4. Refactor
5. UI change
6. Architecture/design question
7. Test failure
8. "I don't understand this part of the codebase"

Avoid giant meta-prompts if a small task prompt would accomplish the same thing.

---

# TOKEN/USAGE SAVINGS PRIORITIZATION

For every optimization recommendation, estimate its likely impact on Claude efficiency using:

**VERY HIGH**

**HIGH**

**MEDIUM**

**LOW**

**NEGLIGIBLE**

Also estimate:

- Implementation effort
- Risk
- Maintainability benefit
- Whether it affects Claude usage directly or indirectly

Example:

| Change | Usage Impact | Effort | Risk | Why |
|---|---|---|---|---|
| Clear sessions between unrelated tasks | Very High | Very Low | None | Prevents unrelated conversation history from carrying forward |
| Remove an unused 5 KB helper file | Negligible | Low | Low | Claude would rarely read it anyway |

This distinction is critical.

I do NOT want to spend hours cleaning things that barely affect Claude usage.

---

# TONE

Be direct, analytical, practical, and educational.

Assume I understand programming concepts but may not understand the internals of Claude Code's context/usage system.

Explain important concepts in plain language.

Avoid:

- vague optimization advice,
- generic clean-code lectures,
- alarmism about token usage,
- unnecessary jargon,
- deleting code just because it looks unfamiliar,
- presenting speculation as fact.

When something is uncertain, label it as uncertain.

I want evidence-based recommendations.

---

# OUTPUT

Produce the final audit in this structure.

## 1. Executive Summary

Give me the most important findings in plain English.

Include:

- Overall codebase health
- Whether meaningful bloat exists
- Whether Claude-specific context bloat exists
- Biggest sources of potential usage waste
- Whether my concern is justified
- Your preliminary Max 5x recommendation

---

## 2. How Claude Code Is Likely Spending My Usage

Explain what is actually consuming my Claude usage in this project.

Separate:

- conversation history,
- automatically loaded instructions,
- files Claude chooses to read,
- tool/MCP context,
- model choice,
- agent/tool calls,
- generated output,
- other meaningful factors.

---

## 3. Repository Architecture Map

Brief architecture overview and important directories.

---

## 4. Codebase Bloat Findings

Table:

| Finding | Evidence | Classification | Impact | Recommended Action |

Classification should be:

- Confirmed bloat
- Probable bloat
- Possible bloat
- Legitimate complexity
- Needs investigation

---

## 5. Claude Context Bloat Findings

Table:

| Context Source | Why It Loads | Approx. Concern | Necessary? | Recommendation |

---

## 6. CLAUDE.md Audit

Show:

- Current weaknesses
- What should stay
- What should move
- What should disappear
- Approximate unnecessary verbosity

Then provide a proposed optimized version.

Do not apply it yet.

---

## 7. Large / High-Risk Context Files

Table:

| File/Pattern | Why It's Expensive | Likelihood Claude Reads It | Recommendation |

---

## 8. Dependencies / Tools / MCP / Agents Audit

Summarize unnecessary or overlapping tooling.

---

## 9. Top Claude Usage Problems

Rank the top 10 factors that are most likely wasting my usage.

Use:

1. Issue
2. Why it matters
3. Estimated impact
4. Exact fix

---

## 10. Optimization Priority Matrix

Group recommendations into:

### DO NOW
Very high return, low effort.

### DO SOON
Meaningful improvement.

### OPTIONAL
Useful but not critical.

### DON'T BOTHER
Changes that technically reduce size but are unlikely to meaningfully affect Claude usage.

---

## 11. Recommended Claude Code Workflow

Give me the repeatable workflow I should use from now on.

---

## 12. Model Selection Strategy

Give me a simple model-selection cheat sheet based on models currently available.

---

## 13. Max 5x Recommendation

Give one of these conclusions:

**Upgrade now**

**Optimize first, then reassess**

**Current plan is probably sufficient**

**Insufficient data — collect these specific metrics**

Explain the reasoning.

---

## 14. Reusable Prompt Templates

Provide the concise templates requested above.

---

## 15. Claude Code Efficiency Checklist

Create a short checklist I can periodically run through.

Example structure:

### Before a task
- [ ] ...

### During a task
- [ ] ...

### After a task
- [ ] ...

### Monthly/project maintenance
- [ ] ...

---

## 16. Proposed Cleanup Plan

Only AFTER finishing the audit, give me an ordered cleanup plan.

For each step include:

- Exact change
- Reason
- Expected Claude efficiency improvement
- General maintainability improvement
- Risk
- How to verify nothing broke

Do NOT execute the cleanup yet.

---

# REVIEW

Before finalizing your audit, review your own conclusions.

Ask yourself:

1. Did I confuse repository size with context size?
2. Did I assume Claude reads files that it does not actually read?
3. Did I recommend deleting something without verifying whether it is used?
4. Did I distinguish technical debt from Claude-specific token waste?
5. Did I prioritize changes according to actual likely usage savings?
6. Did I consider conversation history as well as repository context?
7. Did I inspect Claude-specific configuration?
8. Did I consider MCP/tool overhead?
9. Did I separate model choice from context efficiency?
10. Did I distinguish a genuine need for Max 5x from inefficient use of the current plan?
11. Are my recommendations specific to THIS repository rather than generic Claude Code advice?
12. Did I avoid optimizing things whose expected benefit is negligible?
13. Have I clearly labeled assumptions and uncertainty?
14. Did I verify time-sensitive Claude Code/plan information instead of relying on old knowledge?

If any answer is no, revise the audit before presenting it.

The ultimate objective is NOT simply to make the repository smaller.

The objective is to create a codebase and workflow where:

> **Claude can reliably understand only the context necessary for the current task, make the correct change with minimal unnecessary exploration, verify its work, and then discard irrelevant context before the next task.**

Optimize for **useful work per unit of Claude usage**, not token minimization at the expense of engineering quality.