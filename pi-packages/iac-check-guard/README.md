# iac-check-guard

pi extension that blocks **IaC write/destructive commands** before the Bash tool
runs, so agents never apply changes to real infrastructure. Read-only
invocations pass — testing is still allowed.

The logic lives in `extensions/iac-check-guard.sh`, shared verbatim with the
Claude Code plugin in `plugins/iac-check-guard/` — single source of truth, two
loaders.

## What it blocks

**Ansible** — `ansible-playbook`/`ansible-pull` without `--check` (apply
mode), and ad-hoc `ansible` with write modules (anything but
`ping`/`setup`/`gather_facts`, or `-a` without an explicit read-only module):

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

**Terraform / OpenTofu / Terragrunt** — apply-family and destructive
commands, including `tg`/`tf` aliases and mise-wrapped forms
(`mise run|exec|r|x <tool> -- ...`, positional or `--tool`):

```
terraform apply                          -> DENY
tofu import 'aws_instance.web' 'i-123'   -> DENY
terragrunt destroy                       -> DENY
tg init                                  -> DENY
mise run tg -- import 'vsphere_tag.tag["Application/app-k8s-cp"]' '{"category_name":"Application","tag_name":"app-k8s-cp"}'
                                         -> DENY
mise run tg -- stack clean               -> DENY
mise run tg -- stack generate            -> DENY
mise run tg -- run -- apply tfplan.tfplan -> DENY
mise run tg -- run -- plan -replace=vsphere_virtual_machine.vm -out=tfplan.tfplan
                                         -> DENY  (plan with -out/-replace/-destroy)
```

Write/destructive subcommands: `apply`, `destroy`, `import`, `init`, `refresh`,
`taint`, `untaint`, `force-unlock`, `apply-all`, `destroy-all`, `generate`;
`plan` with `-out`/`-replace`/`-destroy`; `state`/`workspace` mutations
(everything except `list`/`show`/`pull` and `list`/`show` respectively), and
`stack clean`/`generate`/`run`/`run-all` writes.

**Read-only invocations pass** (testing allowed): `--version`, plain `plan`,
`validate`, `show`, `output`, `state list`, `workspace list`, ...

```
mise run tg -- --version                -> pass
mise run tg -- stack run -- state list  -> pass
terraform plan                          -> pass
tofu validate                           -> pass
```

The command is split on shell separators (`& ; |`) and line breaks, and each
segment is analyzed independently.

## Install

```bash
pi install /absolute/path/to/pi-packages/iac-check-guard
# or
omp install /absolute/path/to/pi-packages/iac-check-guard

# via the omp marketplace
omp plugin marketplace add widnyana/eyay-toolkits
omp plugin install iac-check-guard@eyay-toolkits
```

Note: `pi install git:...` installs the repo root, not this subdirectory — use
a local path (or publish this directory as its own npm package).

## Requirements

- `jq` on PATH (used by the check script)
- Runs wherever `bash` exists (macOS/Linux; on Windows needs a bash available to Bun)

## Edit rules

Edit `extensions/iac-check-guard.sh` and mirror it into the Claude plugin
script if the check must stay in sync.