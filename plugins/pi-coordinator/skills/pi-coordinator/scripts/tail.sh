#!/usr/bin/env bash
# usage: tail.sh <unit> [unit...]
# HUMAN-ONLY live view of worker output (not consumed by agents; agents use monitor.sh).
# Follows $PI_WORK/out-<unit>/events.jsonl: streaming assistant text, tool calls, errors,
# plus the final result.txt head. Ctrl-C to stop; does not affect the workers.
set -u
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null; exit; }
trap cleanup INT TERM
for u in "$@"; do
  {
    # jq: "\(.ts)" would parse .ts as a field access (not the def), so bind the epoch first
    # tail -F keeps following across continue.sh's rm -rf/recreate of out-$unit
    tail -F -n +1 "$S/out-$u/events.jsonl" 2>/dev/null \
      | jq -r --arg u "$u" --unbuffered '
          (.t // 0) as $ms
          | if .type == "message_update" and .assistantMessageEvent.type == "text_delta"
          then "\(($ms / 1000 | floor) | strftime("%H:%M:%S")) [\($u)] \(.assistantMessageEvent.delta)"
          elif .type == "tool_execution_start"
          then "\(($ms / 1000 | floor) | strftime("%H:%M:%S")) [\($u)] tool \(.toolName): \((.args.command // .args.file_path // .args.path // (.args | tostring)) | gsub("\n"; " ") | .[0:120])"
          elif .type == "tool_execution_end" and .isError
          then "\(($ms / 1000 | floor) | strftime("%H:%M:%S")) [\($u)] tool \(.toolName) ERROR: \((.result.content[0].text // "") | gsub("\n"; " ") | .[0:200])"
          elif .type == "agent_settled" then "\(($ms / 1000 | floor) | strftime("%H:%M:%S")) [\($u)] --- settled ---"
          else empty end'
  } &
  pids+=($!)
  {
    while true; do
      if [ -f "$S/out-$u/result.txt" ]; then
        echo "[$u] DONE: $(head -c 200 "$S/out-$u/result.txt" | tr '\n' ' ')"
        break
      fi
      sleep 2
    done
  } &
  pids+=($!)
done
wait
