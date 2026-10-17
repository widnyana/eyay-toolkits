#!/usr/bin/env bash
# usage: monitor.sh <unit> [unit...]
# Polls every 10 s. Per worker: state transitions from the driver (state.txt: running → gate → done)
# printed as they change, a guaranteed "<unit> DONE: <outcome> — <summary>" line as soon as
# result.txt exists (the driver always writes it, even on crash), and tools/idle every 90 s.
# Start it with the Monitor tool (timeout 1800000), re-arm on expiry while workers still run.
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
said=
tick=0
while true; do
  all=1
  for u in "$@"; do
    out=$S/out-$u
    if [ -f "$out/result.txt" ]; then
      case " $said " in *" $u "*) ;; *)
        said="$said $u"
        outcome=$(head -1 "$out/result.txt" | sed 's/^OUTCOME: //')
        summary=$(tail -n +2 "$out/result.txt" | head -c 160 | tr '\n' ' ')
        echo "$u DONE: $outcome — $summary"
      ;; esac
    else
      all=0
      st=$(tail -1 "$out/state.txt" 2>/dev/null | cut -d' ' -f2-); st=${st:-starting}
      prev=$(cat "$out/.mon-state" 2>/dev/null)
      [ "$prev" = "$st" ] || { echo "$u: $st"; echo "$st" > "$out/.mon-state"; }
      if [ $((tick % 9)) = 0 ]; then
        ev=$out/events.jsonl
        n=$(grep -c '"tool_execution_start"' "$ev" 2>/dev/null); n=${n:-0}
        age=$(( $(date +%s) - $(stat -f %m "$ev" 2>/dev/null || stat -c %Y "$ev" 2>/dev/null || date +%s) ))
        echo "$u $st tools=$n idle=${age}s"
      fi
    fi
  done
  [ $all = 1 ] && break
  tick=$((tick + 1))
  sleep 10
done
