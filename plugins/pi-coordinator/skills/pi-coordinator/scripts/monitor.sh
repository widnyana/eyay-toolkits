#!/usr/bin/env bash
# usage: monitor.sh <unit> [unit...]
# Polls every 10 s: prints "<unit> DONE: ..." once, as soon as result.txt exists; status lines every 90 s; exits when all are done.
# Start it with the Monitor tool (timeout 1800000), re-arm on expiry while workers still run.
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
said=
tick=0
while true; do
  all=1; status=
  for u in "$@"; do
    ev=$S/out-$u/events.jsonl
    if [ -f "$S/out-$u/result.txt" ]; then
      case " $said " in *" $u "*) ;; *) echo "$u DONE: $(head -c 160 "$S/out-$u/result.txt" | tr '\n' ' ')"; said="$said $u";; esac
    else
      all=0
      n=$(grep -c '"tool_execution_start"' "$ev" 2>/dev/null); n=${n:-0}
      age=$(( $(date +%s) - $(stat -f %m "$ev" 2>/dev/null || stat -c %Y "$ev" 2>/dev/null || date +%s) ))
      status="$status$u running tools=$n idle=${age}s
"
    fi
  done
  [ $all = 1 ] && break
  [ $((tick % 9)) = 0 ] && printf '%s' "$status"
  tick=$((tick + 1))
  sleep 10
done
