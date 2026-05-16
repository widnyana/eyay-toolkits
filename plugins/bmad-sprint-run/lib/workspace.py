from __future__ import annotations

import json
import os
import re
import subprocess
from typing import Optional

from .models import WorkspaceInfo, WorkspaceMap


def discover_workspaces(project_root: str) -> WorkspaceMap:
    """Discover workspaces by reading CLAUDE.md and scanning for build manifests.

    Strategy:
    1. Parse CLAUDE.md for build/test commands grouped under workspace headings.
    2. Scan for known manifest files (package.json, Cargo.toml, pyproject.toml, Makefile)
       to find workspaces not described in CLAUDE.md.
    3. Merge both sources into a WorkspaceMap.
    """
    ws_map = WorkspaceMap()

    _discover_from_claude_md(project_root, ws_map)
    _discover_from_manifests(project_root, ws_map)

    return ws_map


def _discover_from_claude_md(root: str, ws_map: WorkspaceMap) -> None:
    """Parse CLAUDE.md for workspace sections with build/test commands."""
    claude_md = os.path.join(root, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return

    with open(claude_md, "r", encoding="utf-8") as f:
        content = f.read()

    # Match sections like:
    # ### Web App (`apps/web/`)
    # ### API (`apps/api/`)
    # ### Onchain Program
    # followed by fenced code blocks with commands
    section_pattern = re.compile(
        r"^#{2,4}\s+(.+?)(?:\s*\(`([^)]+)`\))?\s*$",
        re.MULTILINE,
    )

    code_block_pattern = re.compile(
        r"```(?:\w+)?\s*\n(.*?)```",
        re.DOTALL,
    )

    sections: list[tuple[str, Optional[str], int]] = []
    for m in section_pattern.finditer(content):
        name = m.group(1).strip()
        path = m.group(2)
        if path and not path.startswith("/"):
            path = path.rstrip("/")
        sections.append((name, path, m.end()))

    for i, (name, path, start) in enumerate(sections):
        end = sections[i + 1][2] if i + 1 < len(sections) else len(content)
        section_text = content[start:end]

        typecheck_cmd = None
        test_cmd = None

        for block_m in code_block_pattern.finditer(section_text):
            block = block_m.group(1)
            for line in block.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue

                is_tc = any(
                    kw in line.lower()
                    for kw in ("typecheck", "tsc --noemit", "mypy", "pyright")
                )
                is_test = any(
                    kw in line.lower()
                    for kw in ("test", "vitest", "jest", "pytest", "cargo test")
                ) and not is_tc

                if is_tc and not typecheck_cmd:
                    typecheck_cmd = _normalize_command(line)
                elif is_test and not test_cmd:
                    # Prefer the simplest test command (no flags)
                    if not test_cmd or len(line) < len(test_cmd):
                        test_cmd = _normalize_command(line)

        if path:
            ws_name = os.path.basename(path)
            if ws_name in ws_map.workspaces:
                existing = ws_map.workspaces[ws_name]
                if typecheck_cmd:
                    existing.typecheck_cmd = typecheck_cmd
                if test_cmd:
                    existing.test_cmd = test_cmd
            else:
                ws_map.workspaces[ws_name] = WorkspaceInfo(
                    path=path,
                    typecheck_cmd=typecheck_cmd,
                    test_cmd=test_cmd,
                )


def _discover_from_manifests(root: str, ws_map: WorkspaceMap) -> None:
    """Scan for known build manifests and register workspaces not already known."""
    manifest_dirs = _find_manifest_dirs(root)

    for rel_path in manifest_dirs:
        ws_name = os.path.basename(rel_path)
        if ws_name in ws_map.workspaces:
            continue

        typecheck_cmd = _infer_typecheck_cmd(root, rel_path)
        test_cmd = _infer_test_cmd(root, rel_path)

        ws_map.workspaces[ws_name] = WorkspaceInfo(
            path=rel_path,
            typecheck_cmd=typecheck_cmd,
            test_cmd=test_cmd,
        )


def _find_manifest_dirs(root: str) -> list[str]:
    """Find directories containing build manifests under common workspace roots."""
    manifest_files = [
        "package.json",
        "Cargo.toml",
        "pyproject.toml",
        "go.mod",
    ]
    search_roots = [
        os.path.join(root, "apps"),
        os.path.join(root, "packages"),
        os.path.join(root, "services"),
        os.path.join(root, "programs"),
        os.path.join(root, "contracts"),
        root,  # root itself may have a manifest
    ]

    found: list[str] = []
    for search_root in search_roots:
        if not os.path.isdir(search_root):
            continue

        for entry in os.listdir(search_root):
            entry_path = os.path.join(search_root, entry)
            if not os.path.isdir(entry_path):
                continue
            if entry.startswith(".") or entry in ("node_modules", "target", "__pycache__", ".git"):
                continue

            has_manifest = any(
                os.path.isfile(os.path.join(entry_path, mf))
                for mf in manifest_files
            )
            if has_manifest:
                rel = os.path.relpath(entry_path, root)
                if rel == ".":
                    rel = "."
                found.append(rel)

    # Check root itself
    root_has_manifest = any(
        os.path.isfile(os.path.join(root, mf))
        for mf in manifest_files
    )
    if root_has_manifest and "." not in found:
        found.append(".")

    return sorted(set(found))


def _infer_typecheck_cmd(root: str, rel_path: str) -> Optional[str]:
    """Infer a typecheck command from the manifest contents."""
    abs_path = os.path.join(root, rel_path)

    pkg_json = os.path.join(abs_path, "package.json")
    if os.path.isfile(pkg_json):
        try:
            with open(pkg_json, "r", encoding="utf-8") as f:
                pkg = json.load(f)
        except Exception:
            return None

        scripts = pkg.get("scripts", {})
        for key in ("typecheck", "type-check", "check"):
            if key in scripts:
                return _pkg_run(key, abs_path, root)

    cargo_toml = os.path.join(abs_path, "Cargo.toml")
    if os.path.isfile(cargo_toml):
        return "cargo check"

    return None


def _infer_test_cmd(root: str, rel_path: str) -> Optional[str]:
    """Infer a test command from the manifest contents."""
    abs_path = os.path.join(root, rel_path)

    pkg_json = os.path.join(abs_path, "package.json")
    if os.path.isfile(pkg_json):
        try:
            with open(pkg_json, "r", encoding="utf-8") as f:
                pkg = json.load(f)
        except Exception:
            return None

        scripts = pkg.get("scripts", {})
        for key in ("test", "test:ci"):
            if key in scripts:
                return _pkg_run(key, abs_path, root)

    cargo_toml = os.path.join(abs_path, "Cargo.toml")
    if os.path.isfile(cargo_toml):
        return "cargo test"

    return None


def _normalize_command(cmd: str) -> str:
    """Rewrite `bun test` to `bun run test`.

    `bun test` invokes Bun's built-in test runner, which ignores the
    package.json `test` script. The runner must execute the project's own
    configured test script, so any scraped `bun test` is corrected here.
    """
    return re.sub(r"\bbun test\b", "bun run test", cmd)


def _pkg_run(script_key: str, *search_dirs: str) -> str:
    """Return the package manager run command for a script key.

    Looks for a bun lockfile in each given directory (workspace dir, repo
    root) rather than the process cwd, so detection holds wherever the
    runner is invoked from.
    """
    for d in search_dirs:
        if os.path.isfile(os.path.join(d, "bun.lockb")) or os.path.isfile(
            os.path.join(d, "bun.lock")
        ):
            return f"bun run {script_key}"
    return f"npm run {script_key}"


# Quality-gate commands are discovered (scraped from CLAUDE.md, inferred from
# manifests) and executed verbatim with shell=True. Any command that could
# delete files or rewrite the working tree / branch history is refused before
# execution — the runner runs typecheck and tests, nothing destructive.
_CMD_START = r"(?:^|[\n;&|]|&&|\|\|)\s*"
_FORBIDDEN_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(_CMD_START + r"rm\b"), "rm"),
    (re.compile(_CMD_START + r"rmdir\b"), "rmdir"),
    (re.compile(r"\bgit\s+reset\b"), "git reset"),
    (re.compile(r"\bgit\s+clean\b"), "git clean"),
    (re.compile(r"\bgit\s+restore\b"), "git restore"),
    (re.compile(r"\bgit\s+checkout\s+--"), "git checkout --"),
]


def _forbidden_operation(cmd: str) -> Optional[str]:
    """Return the label of the first forbidden destructive token found, or None."""
    for pattern, label in _FORBIDDEN_PATTERNS:
        if pattern.search(cmd):
            return label
    return None


def run_command(
    cmd: str,
    cwd: Optional[str] = None,
    timeout: int = 300,
) -> tuple[bool, str]:
    """Run a shell command and return (success, combined_output).

    stdout and stderr are captured and combined. A non-zero exit code or
    a timeout results in failure. A command containing a forbidden
    destructive operation is refused without being executed.
    """
    forbidden = _forbidden_operation(cmd)
    if forbidden:
        return False, (
            f"Refused: command contains forbidden destructive operation "
            f"'{forbidden}'. The sprint runner only runs typecheck/tests. "
            f"Command: {cmd}"
        )

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr
        output = output.strip()
        return result.returncode == 0, output
    except subprocess.TimeoutExpired:
        return False, f"Command timed out after {timeout}s: {cmd}"
    except FileNotFoundError:
        return False, f"Command not found: {cmd}"
    except Exception as exc:
        return False, f"Execution error: {exc}"


def _workspace_dir(workspace: WorkspaceInfo, project_root: str) -> str:
    """Absolute directory a workspace's commands must run in.

    Quality-gate commands (`bun run check`, `npm test`, `cargo test`, ...) are
    relative to the workspace's own manifest, not the repo root. Running them
    from project_root makes the package manager resolve the wrong package.json
    and report bogus "Script not found" failures.
    """
    path = workspace.path or "."
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(project_root, path))


def run_typecheck(
    workspace: WorkspaceInfo,
    project_root: str,
) -> tuple[bool, str]:
    """Run typecheck for a workspace. Returns (success, output)."""
    if not workspace.typecheck_cmd:
        return True, "No typecheck command configured, skipping."
    return run_command(
        workspace.typecheck_cmd, cwd=_workspace_dir(workspace, project_root)
    )


def run_tests(
    workspace: WorkspaceInfo,
    project_root: str,
) -> tuple[bool, str]:
    """Run tests for a workspace. Returns (success, output)."""
    if not workspace.test_cmd:
        return True, "No test command configured, skipping."
    return run_command(
        workspace.test_cmd, cwd=_workspace_dir(workspace, project_root)
    )


def run_quality_gate(
    ws_map: WorkspaceMap,
    affected_workspaces: list[str],
    project_root: str,
) -> tuple[bool, list[str]]:
    """Run typecheck and tests for affected workspaces.

    Returns (all_passed, list_of_failure_messages).
    If no affected workspaces match, runs all workspaces defensively.
    """
    targets = affected_workspaces
    if not targets:
        targets = list(ws_map.workspaces.keys())

    all_passed = True
    failures: list[str] = []

    for name in sorted(targets):
        ws = ws_map.workspaces.get(name)
        if not ws:
            continue

        tc_ok, tc_out = run_typecheck(ws, project_root)
        if not tc_ok:
            all_passed = False
            failures.append(f"[{name}] Typecheck failed:\n{tc_out[-2000:]}")

        test_ok, test_out = run_tests(ws, project_root)
        if not test_ok:
            all_passed = False
            failures.append(f"[{name}] Tests failed:\n{test_out[-2000:]}")

    return all_passed, failures
