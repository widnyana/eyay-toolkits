# Contributing to Eyay Toolkits

Thank you for your interest in contributing! Here's how to add or improve plugins in this marketplace.

## Adding a New Plugin

### Step 1: Create the plugin directory

```bash
mkdir plugins/my-plugin
cd plugins/my-plugin
```

### Step 2: Create required files

Create these files in your plugin directory:

#### `SKILL.md` — The main plugin definition

Your plugin's instructions. See `plugins/technical-writer/SKILL.md` for a template.

```markdown
---
name: my-plugin
description: |
  Brief description of what your plugin does.
  When to use it.
---

# My Plugin

## Philosophy
...

## Core Principles
...

## Patterns
...
```

#### `.claude-plugin/plugin.json` — Plugin manifest

Create a `.claude-plugin/` directory and add `plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What does this plugin do?"
}
```

#### `package.json` — NPM package definition

```json
{
  "name": "@widnyana/my-plugin",
  "version": "1.0.0",
  "description": "What does this plugin do?",
  "main": "SKILL.md",
  "type": "module",
  "author": "your-name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/widnyana/eyay-toolkits.git",
    "directory": "plugins/my-plugin"
  },
  "files": ["SKILL.md", "README.md", ".claude-plugin/plugin.json"]
}
```

#### `README.md` — User-facing documentation

A quick reference guide. See `plugins/technical-writer/README.md` for a template.

### Step 3: Update marketplace files

Update `.claude-plugin/marketplace.json` to add your plugin entry:

```json
{
  "plugins": [
    {
      "name": "my-plugin",
      "description": "What does this plugin do?",
      "source": "./plugins/my-plugin",
      "author": {
        "name": "your-name"
      },
      "homepage": "https://github.com/widnyana/eyay-toolkits/tree/main/plugins/my-plugin"
    }
  ]
}
```

Update the root `package.json` `workspaces`:

```json
{
  "workspaces": [
    "plugins/technical-writer",
    "plugins/my-plugin"
  ]
}
```

### Step 4: Test your plugin

- Ensure all files are present and properly formatted
- Test the plugin with Claude Code
- Verify documentation is clear and helpful

### Step 5: Submit a PR

1. Fork the repository
2. Create a branch: `git checkout -b add-my-plugin`
3. Commit your changes
4. Push and create a pull request

## Improving Existing Plugins

To improve or fix an existing plugin:

1. Make your changes to the plugin files
2. Update version numbers in `.claude-plugin/plugin.json` and `package.json`
3. Update `marketplace.json` with the new version (if applicable)
4. Test thoroughly
5. Submit a PR with a clear description of improvements

## Quality Standards

All plugins should meet these standards:

- **Clear documentation** — README and SKILL.md are easy to understand
- **Tested** — Plugin has been tested and produces reliable results
- **Honest** — No marketing language, realistic capabilities stated
- **Helpful** — Genuinely useful for the target audience
- **Maintained** — Author commits to fixing issues and accepting improvements

## License

All plugins must be licensed under MIT or compatible open-source license.

## Questions?

Open an issue or discussion on GitHub:
- Issues: https://github.com/widnyana/eyay-toolkits/issues
- Discussions: https://github.com/widnyana/eyay-toolkits/discussions
