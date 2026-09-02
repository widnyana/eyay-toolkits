# iac-check-guard

A Claude Code **PreToolUse** hook for the `Bash` tool. It inspects every IaC
command Claude is about to run and **denies** write/destructive invocations:

- **Ansible** — `ansible-playbook`/`ansible-pull` without `--check`, and
  ad-hoc `ansible` with write modules (anything but
  `ping`/`setup`/`gather_facts`, or `-a` without an explicit read-only module)
- **Terraform / OpenTofu / Terragrunt** — apply-family and destructive
  commands, including `tg`/`tf` aliases and mise-wrapped forms
  (`mise run tg -- ...`)

It is silent (exit 0, no JSON) on everything else — so non-IaC commands and
read-only IaC (testing) are never disturbed.

## Install

Enable this plugin (`/plugin install iac-check-guard` or via
`npx skills add widnyana/eyay-toolkits`) and the hook registers itself
automatically as a `PreToolUse` hook — no `settings.json` editing required.
Requires `jq` on `PATH` (used to read the payload and emit the verdict).

The hook reads the JSON payload Claude sends on stdin and emits a JSON verdict
on stdout. `deny` = block the command and show the reason to the model;
silence = allow.

## What it blocks

### Ansible

```
ansible-playbook -i hosts prod.yml               -> DENY
ansible-pull -U https://repo/playbook.git        -> DENY
ansible all -m copy -a src=/tmp/a dest=/tmp/b    -> DENY  (write module)
ansible all -a "reboot"                          -> DENY  (default-command -a)
sudo -E ansible-playbook -i hosts prod.yml       -> DENY  (wrapper stripped)
ansible-playbook --check -i hosts prod.yml       -> pass
ansible-playbook --check=diff -i hosts prod.yml  -> pass
ansible all -m ping                              -> pass  (read-only module)
ansible-playbook --version                       -> pass  (read-only flag)
grep ansible-playbook README.md                  -> pass  (mention, not a run)
```

### Terraform / OpenTofu / Terragrunt

```
terraform apply                           -> DENY
tofu import 'aws_instance.web' 'i-123'    -> DENY
terragrunt destroy                        -> DENY
tg init                                   -> DENY
mise run tg -- import 'vsphere_tag.tag["Application/app-k8s-cp"]' '{"category_name":"Application","tag_name":"app-k8s-cp"}'
                                          -> DENY
mise run tg -- stack clean                -> DENY
mise run tg -- stack generate             -> DENY
mise run tg -- run -- apply tfplan.tfplan -> DENY
mise run tg -- run -- plan -replace=vsphere_virtual_machine.vm -out=tfplan.tfplan
                                          -> DENY  (plan with -out/-replace/-destroy)
```

Write/destructive subcommands: `apply`, `destroy`, `import`, `init`, `refresh`,
`taint`, `untaint`, `force-unlock`, `apply-all`, `destroy-all`, `generate`;
`plan` with `-out`/`-replace`/`-destroy`; `state`/`workspace` mutations
(everything except `list`/`show`/`pull` and `list`/`show` respectively), and
`stack clean`/`generate`/`run`/`run-all` writes.

### Read-only passes (testing allowed)

```
mise run tg -- --version                -> pass
mise run tg -- stack run -- state list  -> pass
terraform plan                          -> pass
tofu validate                           -> pass
```

### Command segmentation
The command is split on shell separators `& ; |` and line breaks, and each
segment is analyzed independently, so
`terraform apply && terraform plan` is still denied for the `apply` segment.

## Legit bypass

This is a safety hook and over-blocks on purpose. When you are certain a
denied command is correct, run it yourself in the terminal — the hook only
governs commands Claude issues through the Bash tool, not your shell.

## Testing

Feed sample payloads through stdin and check the output. `deny` produces a
JSON line with `permissionDecision:"deny"`; safe commands print nothing and
exit 0.

```
H=hooks/scripts/iac-check-guard.sh

# must DENY:
printf '%s' '{"tool_input":{"command":"ansible-playbook -i hosts prod.yml"}}' | bash "$H"
printf '%s' '{"tool_input":{"command":"terraform apply"}}'                     | bash "$H"
printf '%s' '{"tool_input":{"command":"mise run tg -- import x y"}}'           | bash "$H"

# must PASS (empty output, exit 0):
printf '%s' '{"tool_input":{"command":"ansible-playbook --check -i hosts prod.yml"}}' | bash "$H"
printf '%s' '{"tool_input":{"command":"mise run tg -- --version"}}'                   | bash "$H"
printf '%s' '{"tool_input":{"command":"terraform plan"}}'                             | bash "$H"
printf '%s' '{"tool_input":{"command":"mise run tg -- stack run -- state list"}}'     | bash "$H"
```