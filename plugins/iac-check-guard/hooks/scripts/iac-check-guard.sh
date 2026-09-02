#!/usr/bin/env bash
# PreToolUse hook: deny IaC write/destructive invocations.
#
# Denies:
#   - ansible-playbook without --check (apply mode)
#   - ansible-pull without --check
#   - ad-hoc `ansible <hosts> [-m <module>] ...`: any module except the
#     read-only set (ping, setup, gather_facts), and default-command (`-a`)
#     runs without --check
#   - terragrunt/tofu/terraform apply-family commands: apply, destroy, import,
#     init, refresh, taint, untaint, force-unlock, apply-all, destroy-all,
#     generate; terragrunt stack clean/generate; `plan` with -out/-replace/
#     -destroy; state/workspace mutations; including mise-wrapped forms
#     (`mise run|exec tg -- ...`, `mise run tf -- ...`, ...).
#
# Wrapper-resistant: leading `sudo`, `env VAR=val ...`, `command`, and quote
# wrapping (sudo ansible-playbook, env X=1 tf apply, 'terraform' apply) are
# stripped before classification. Read-only invocations pass (version, plain
# plan, validate, show, output, state list/show/pull, workspace list/show, ...).
# Silent (exit 0) otherwise.
# Shared with the Claude Code plugin in plugins/iac-check-guard/ — single
# source of truth, two loaders.
set -o pipefail

input="$(cat)"
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
[ -z "$cmd" ] && exit 0

deny() {
  jq -nc --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# ── Detection ───────────────────────────────────────────────────────────────
# Write/destructive subcommands (terraform/tofu/terragrunt + aliases tg/tf).
IAC_WRITES="apply destroy import init refresh taint untaint force-unlock apply-all destroy-all generate"
# Read-only subcommands (everything else also passes).
IAC_READS="version validate validate-inputs show output graph console fmt test check list providers workspace state plan"

is_write() { # $1 = subcommand
  local s
  for s in $IAC_WRITES; do [ "$1" = "$s" ] && return 0; done
  return 1
}

is_read() { # $1 = subcommand
  local s
  for s in $IAC_READS; do [ "$1" = "$s" ] && return 0; done
  return 1
}

plan_denied() { # $@ = tokens after `plan`
  local t
  for t in "$@"; do
    case "$t" in
      -out*) return 0 ;;
      -replace*) return 0 ;;
      -destroy*) return 0 ;;
    esac
  done
  return 1
}
# strip_wrappers — canonical argv from a token array: drop leading sudo /
# command / env VAR=VAL... wrappers and unwrap quotes on the binary.
# Fills the global CANON array (no printf/$(...) round-trip: that word-splits
# and glob-expands the args).
CANON=()
strip_wrappers() {
  local -a t=("$@")
  local i=0
  while [ $i -lt ${#t[@]} ]; do
    case "${t[$i]}" in
      sudo)
        i=$((i+1))
        # consume sudo flags; arg-taking flags (-u, -g, -p, ...) carry their
        # value as the next token, so skip two
        while [ $i -lt ${#t[@]} ]; do
          case "${t[$i]}" in
            -A|-C|-D|-g|-p|-R|-r|-t|-T|-U|-u) i=$((i+2)) ;;
            -*) i=$((i+1)) ;;
            *) break ;;
          esac
        done
        ;;
      command) i=$((i+1)) ;;
      env)
        i=$((i+1))
        # consume env flags (-i, -u VAR) and VAR=val assignments
        while [ $i -lt ${#t[@]} ] && { [[ "${t[$i]}" == -* ]] || [[ "${t[$i]}" == *=* ]]; }; do i=$((i+1)); done
        ;;
      *) break ;;
    esac
  done
  local bin="${t[$i]:-}"
  # unwrap `'`/`"` around the binary token
  case "$bin" in
    \'*\') bin="${bin#\'}"; bin="${bin%\'}" ;;
    \"*\") bin="${bin#\"}"; bin="${bin%\"}" ;;
  esac
  CANON=("$bin" "${t[@]:$((i+1))}")
}

deny_iac() { # $1 = command line (for the reason)
  deny "Blocked: $1. This repo forbids agents from changing real infrastructure via IaC tools (terraform/tofu/terragrunt). Re-run with a read-only form (e.g. --version, plain plan), then hand the apply/import command to the user."
}

# classify_iac <tool> [args...] — peels wrapper prefixes, then decides.
# Read-only on unknown subcommands (default-pass).
classify_iac() {
  local tool="$1"; shift
  local -a a=("$@")
  while [ ${#a[@]} -gt 0 ]; do
    case "${a[0]}" in
      -*) a=("${a[@]:1}") ;;                                   # leading flags
      run-all) a=("${a[@]:1}") ;;                              # run-all <sub>
      run)                                                     # run [--] <sub>
        a=("${a[@]:1}")
        [ "${a[0]:-}" = "--" ] && a=("${a[@]:1}")
        ;;
      stack)
        case "${a[1]:-}" in
          clean|generate) deny_iac "$tool stack ${a[1]}" ;;
          run|run-all)
            a=("${a[@]:2}")
            [ "${a[0]:-}" = "--" ] && a=("${a[@]:1}")
            continue
            ;;
          *) return 0 ;;                                       # stack list/show
        esac
        return 0
        ;;
      *) break ;;
    esac
  done

  local sub=""
  [ ${#a[@]} -gt 0 ] && sub="${a[0]}"
  [ -z "$sub" ] && return 0

  if is_write "$sub"; then
    deny_iac "$tool $sub"
    return 0
  fi
  if is_read "$sub"; then
    case "$sub" in
      plan)
        if plan_denied "${a[@]:1}"; then
          deny_iac "$tool plan"
        fi ;;
      state)
        case "${a[1]:-}" in
          list|show|pull) : ;;
          *) deny_iac "$tool state ${a[1]-}" ;;
        esac ;;
      workspace)
        case "${a[1]:-}" in
          list|show) : ;;
          *) deny_iac "$tool workspace ${a[1]-}" ;;
        esac ;;
    esac
  fi
  return 0
}

# ── Ansible ─────────────────────────────────────────────────────────────────
ANSIBLE_READONLY_MODULES="ping setup gather_facts"

# check_ansible <canonical argv...> — deny ansible* write forms.
# $1 = the binary (ansible-playbook|ansible-pull|ansible)
check_ansible() {
  local bin="$1"; shift
  local -a a=("$@")

  # --check / --check=* anywhere on the command line = dry run, allowed.
  local t
  for t in "${a[@]}"; do
    case "$t" in
      --check|--check=*) return 0 ;;
    esac
  done

  # Read-only flags never touch infrastructure.
  for t in "${a[@]}"; do
    case "$t" in
      --version|--help|--syntax-check|--list-tasks|--list-tags|--list-hosts) return 0 ;;
    esac
  done

  case "$bin" in
    ansible-playbook|ansible-pull)
      deny "Blocked: $bin without --check. This repo forbids agents from changing real infrastructure. Re-run with --check (add --diff), then hand the apply command to the user:
  ${bin} ${a[*]}"
      ;;
    ansible)
      # ad-hoc: -m/--module selects the module; -a passes args (default module
      # "command" when -m absent). Read-only module allowlist passes.
      local mod="" m ok=0 i=0
      for ((i=0; i<${#a[@]}; i++)); do
        case "${a[$i]}" in
          -m|--module-name) mod="${a[$((i+1))]:-}" ;;
          --module-name=*) mod="${a[$i]#--module-name=}" ;;
        esac
      done

      if [ -n "$mod" ]; then
        for m in $ANSIBLE_READONLY_MODULES; do [ "$mod" = "$m" ] && ok=1; done
        [ $ok -eq 0 ] && deny "Blocked: ansible -m $mod. Read-only modules (${ANSIBLE_READONLY_MODULES// /, }) are allowed; anything else changes infrastructure. Re-run with --check, then hand the real command to the user."
      elif [ -z "$mod" ]; then
        # no -m → default "command" module; -a executes an arbitrary command.
        for t in "${a[@]}"; do
          if [ "$t" = "-a" ] || [ "$t" = "--args" ]; then
            deny "Blocked: ansible default-command (-a) without an explicit read-only module. Re-run with --check or a read-only module (ping, setup, gather_facts)."
          fi
        done
      fi
      ;;
  esac
}
# Join backslash-newline continuations so a write subcommand on the
# continuation line is classified with its mise invocation.
cmd="${cmd//[^\\]\\$'\n'/ }"

segments="$(printf '%s\n' "$cmd" | tr '&;|' '\n\n\n')"

while IFS= read -r seg; do
  [ -z "$seg" ] && continue
  trimmed="$(printf '%s' "$seg" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$trimmed" ] && continue

  # Tokenize (quoted args with spaces collapse — fine for subcommand/flag scan).
  read -r -a tok <<<"$trimmed"

  strip_wrappers "${tok[@]}"
  [ ${#CANON[@]} -eq 0 ] && continue
  cbin="${CANON[0]}"
  case "$cbin" in
    ansible-playbook|ansible-pull|ansible)
      check_ansible "$cbin" "${CANON[@]:1}"
      ;;
    terragrunt|terraform|tofu|tg|tf)
      classify_iac "$cbin" "${CANON[@]:1}"
      ;;
    mise)
      # `mise <run|exec|r|x> [--tool|-t <tool> | <tool>] [--] <args...>`.
      # Tool is positional (CANON[2]) or given via --tool/-t (CANON[3]).
      case "${CANON[1]:-}" in
        run|exec|r|x)
          mi=2; mtool="${CANON[2]:-}"
          case "$mtool" in
            --tool|-t) mtool="${CANON[3]:-}"; mi=4 ;;
          esac
          margs=("${CANON[@]:$((mi+1))}")
          [ "${margs[0]:-}" = "--" ] && margs=("${margs[@]:1}")
          case "$mtool" in
            tg|tf|tofu|terraform|terragrunt) classify_iac "$mtool" "${margs[@]}" ;;
          esac
          ;;
      esac
      ;;
  esac
done <<<"$segments"

exit 0