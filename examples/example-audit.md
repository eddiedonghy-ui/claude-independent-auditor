# Example audit

A sketch of what `/audit` returns. Suppose Claude just answered a question about sizing a cache and claimed:

> "With 10,000 requests per second and a 50ms average latency, you'll need about 50 concurrent connections, so a pool of 64 is plenty."

Running `/audit` produces something like:

---

# 🔍 Independent Audit

**Verdict:** ❌ FAIL
**One-line basis:** The concurrency estimate is off by 10×; the recommended pool size would be badly undersized.

## Dimension scorecard
| Dimension | Status | Notes |
|---|---|---|
| Factual / computational | ❌ | Little's Law misapplied — see finding |
| Logical consistency | ⚠️ | Conclusion follows from the wrong number |
| Objectivity / bias | ✅ | No bias; stated plainly |
| Completeness | ⚠️ | No mention of burst headroom or connection limits |

## Findings

### [CRITICAL · Confirmed] Concurrency miscalculated (Dimension 1)
- **Claim audited:** "10,000 requests per second and a 50ms average latency … about 50 concurrent connections"
- **Problem:** Little's Law gives L = λ × W = 10,000 × 0.050 = **500** concurrent in-flight requests, not 50. The answer appears to have used 5ms or dropped a zero.
- **Evidence:** `node -e "console.log(10000*0.050)"` → `500`.
- **Fix direction:** Recompute with L = 500; a pool of 64 is ~8× too small.

### [MAJOR · Likely] No burst or saturation headroom (Dimension 4)
- **Claim audited:** "a pool of 64 is plenty"
- **Problem:** Even at the correct steady-state of 500, there's no allowance for p99 latency spikes or traffic bursts, which is when pools exhaust.
- **Evidence:** Standard pool-sizing guidance adds headroom above steady-state mean.
- **Fix direction:** Size for peak/p99, not mean; state the assumed peak.

## What holds up
- The decision to reason from request rate and latency (a Little's Law setup) is the right approach.
- Latency was correctly converted to the right order of magnitude of the formula, just with a wrong intermediate.

---

A clean answer instead returns **✅ PASS** with an empty Findings section and a short "What holds up" note — the auditor is told not to invent problems.
