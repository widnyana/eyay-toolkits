#!/usr/bin/env bash
# usage: monitor.sh <unit> [unit...]
# Polls every 10 s (PI_POLL overrides, tests). Per worker: state transitions from the driver
# (state.txt: running → gate → done) printed as they change, a guaranteed
# "<unit> DONE: <outcome> — <summary>" line as soon as result.txt exists (the driver always
# writes it, even on crash), and tools/idle every 90 s.
# Start it with the Monitor tool (timeout 1800000), re-arm on expiry while workers still run.
# Guards: if out-<unit>/ has no driver output (launch failed, or its PI_WORK differs from
# this shell), print the remedy every 90 s instead of erroring on .mon-state; if no worker
# produces anything for PI_MISSING_TICKS ticks (default 30 ≈ 5 min), exit 1 — a launch
# failure the agent must chase, not something to re-arm over.
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
poll=${PI_POLL:-10}
maxmiss=${PI_MISSING_TICKS:-30}
said=
dead=0
tick=0
while true; do
  all=1
  any=0
  for u in "$@"; do
    out=$S/out-$u
    if [ -f "$out/result.txt" ]; then
      any=1
      case " $said " in *" $u "*) ;; *)
        said="$said $u"
        outcome=$(head -1 "$out/result.txt" | sed 's/^OUTCOME: //')
        summary=$(tail -n +2 "$out/result.txt" | head -c 160 | tr '\n' ' ')
        echo "$u DONE: $outcome — $summary"
      ;; esac
    else
      all=0
      [ -d "$out" ] || mkdir -p "$out" 2>/dev/null
      if [ -f "$out/state.txt" ]; then
        any=1
        st=$(tail -1 "$out/state.txt" 2>/dev/null | cut -d' ' -f2-); st=${st:-starting}
        prev=$(cat "$out/.mon-state" 2>/dev/null)
        [ "$prev" = "$st" ] || { echo "$u: $st"; echo "$st" > "$out/.mon-state"; }
        if [ $((tick % 9)) = 0 ]; then
          ev=$out/events.jsonl
          n=$(grep -c '"tool_execution_start"' "$ev" 2>/dev/null); n=${n:-0}
          age=$(( $(date +%s) - $(stat -f %m "$ev" 2>/dev/null || stat -c %Y "$ev" 2>/dev/null || date +%s) ))
          echo "$u $st tools=$n idle=${age}s"
        fi
      elif [ $((tick % 9)) = 0 ]; then
        echo "monitor: out-$u has no driver output yet — launch may have failed (check $S/run-$u.log; PI_WORK must match the launch shell). Relaunch: launch.sh $u"
      fi
    fi
  done
  [ $all = 1 ] && exit 0
  if [ $any = 1 ]; then dead=0
  else
    dead=$((dead + 1))
    [ $dead -lt $maxmiss ] || { echo "monitor: no worker output after $((maxmiss * poll))s — giving up; this is a launch failure: check run-<unit>.log, fix the cause, relaunch"; exit 1; }
  fi
  tick=$((tick + 1))
  sleep "$poll"
done
