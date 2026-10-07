# Design rules

## Goals file template

Write this before any drawing. Keep it in the scratchpad. Ask for the user's go.

```
# Goals: <diagram name>
1. Purpose: one picture of <what> that matches <source doc>. The doc is the source of truth.
   Readers: <who uses which frames>.
2. Success criteria, each checkable
   Accuracy:     A1 every value comes from the doc. A2 undecided values are tagged.
                 A3 names match the doc exactly. A4 nothing contradicts the doc.
   Completeness: C1.. list each item and the frame that shows it.
   Readability:  R1 min font 16. R2 no text outside its box. R3 no overlaps.
                 R4 arrows bound and axis-aligned. R5 each frame answers one question alone.
                 R6 one color per tier, one line style per meaning, a legend frame.
                 R7 two-column grid with wide gaps.
   Rendering:    G1 valid JSON, opens with no blank boxes. G2 frame title is its name.
                 G3 no emoji and no dashes beyond the hyphen.
3. Non-goals: no new facts, no live counts that go stale, no secrets, no per-pod detail.
4. Deliverables: new file, doc embed and frame table, old file to .trash, generator stays in scratch.
5. Verification: build checks, validate, crosscheck, look at every frame, user opens it in Obsidian.
6. Time estimate in hours.
```

## Frames that worked

Order frames by the questions a reader needs answered: the whole, the physical base, the network, the rules, then each tier, then flows and failures.

| Frame | Content |
|---|---|
| Legend | Tier swatches, line styles with sample arrows, status tags, how to read, source path |
| Overview | Zones and build order in plain words, no IPs or ports, decisions box |
| Physical estate | Hardware, hypervisor, storage layers, and a box of limits that follow from them |
| Network and addressing | Router on top, one zone per VLAN, header node with CIDR, host nodes with proposed addresses |
| Firewall rules | Rule table, the same rules as a matrix, a small flow picture, a state-and-safety note |
| NAT or egress | Columns: group, address list, rule, public address, destination, with the rule order |
| Ingress path | Left to right chain from users to pod, TLS termination marked, certificate path in a band below |
| Platform internals | Nodes, in-cluster components, external dependencies, bootstrap |
| Data tier | One zone per service with replication, ports, and the failure caveat |
| Storage | Cluster nodes, clients, open design points, the move to other hardware as a numbered chain |
| Monitoring and backups | Agent to server to alert target, backup chain, the rule pointer |
| Traffic flows | One lane per flow, numbered hops, one node per hop |
| Failure modes and rollout | Failure table next to the build-order graph |

## Layout numbers

- Frame 2400 wide, margin 60, zone inner padding 16, node padding 16.
- Columns of boxes: gap at least 60 px with no label, at least label width plus 8 px with one.
- Label width in px is about `characters x 9.6 + 12` at 16 px sans. A two-line label has the width of its longer line.
- Row of N equal boxes in a zone of inner width W: `w = (W - (N-1) x gap) / N`.
- Mono 16 px fits `inner_width / 9.92` characters per line. Sans 20 px fits `inner_width / 12`.
- Table column widths are given in characters. Table width is `sum(chars) x 9.92 + 20 x (columns + 1)`.
- Frame height comes from content (`fit()`). Do not pad frames to equal height.

## Colors

Defined in `TIERS` in `scripts/xl.py`. Keep one color per tier on every frame.

| Tier | Stroke | Meaning in the reference run |
|---|---|---|
| ext | grey 495057 | Internet, Cloudflare, R2 |
| rtr | red c92a2a | Router, firewall, NAT |
| dmz | orange e8590c | Proxy tier |
| apps | blue 1971c2 | Certificate issuer, monitoring |
| data | purple 6741d9 | Databases |
| k8s | green 2f9e44 | Kubernetes |
| sto | teal 0c8599 | Ceph |
| tool | magenta a61e4d | Tooling environment |
| phys | dark 343a40 | Hardware |
| other | light grey, dashed | Other environments |
| prod | brown 8d5524 | The environment being designed |
| warn | amber e67700 | Risks, open points, rules |

Arrow kinds: data solid dark, control dashed blue, planned dotted grey, blocked dashed red.

## Status tags

Put the tag as the last line of a node. Meanings: decided (in the doc, dated), proposed (chosen, not allocated), to assign (does not exist yet), open (waits for an answer), later phase (dashed outline), user-verify (only a person with access can confirm).

## Fill and whitespace

A zone with a long empty bottom looks unfinished. Add a node that states an open point, a limit, or a note from the source. If no source fact exists, shrink the zone.

## Doc changes that go with a diagram

When the diagram needs a fact the doc lacks, add the fact to the doc first, marked proposed or open if it is not decided. In the reference run this added: a proposed host address table, a default ports table, an open design point, a failure-mode table, and the frame table with the embed.
