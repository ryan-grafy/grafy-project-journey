# Tool Usage Rules

Whenever you (the AI Agent) call a task delegation tool or background execution tool (like `delegate_task`, `execute_subtask`, etc.), you MUST explicitly include the following parameter:

- **run_in_background**: (boolean) 
    - Use `false` for standard task delegation where you need to wait for the report.
    - Use `true` only for parallel exploration.

Failure to include this parameter will result in an "Invalid arguments" error. 

# Skill Management

You possess the capability to "Load Skills" from external sources or local directories.
- Skills are stored in `.agent/skills/` or `.opencode/skills/`.
- To load a skill, use the `view_file` tool to read the `SKILL.md` within the skill directory.
- Once read, strictly follow the instructions and use the attached scripts/resources as described in the skill.
