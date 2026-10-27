export const meta = {
  name: 'figma-to-ui',
  description: 'Figma design to UI code, through a fidelity gate and a code review gate, ready for human merge review',
  whenToUse: 'When a Figma frame must be implemented as UI and checked against uiux-development-standard.md and uiux-code-review-standard.md',
  phases: [
    { title: 'Extract', detail: 'design-extractor writes the design spec' },
    { title: 'Build', detail: 'ui-builder implements from the spec and the development standard' },
    { title: 'Validate', detail: 'fidelity-validator compares the build with Figma' },
    { title: 'Refine', detail: 'ui-builder fixes only the listed deltas or findings' },
    { title: 'Review', detail: 'three code-reviewers, one per dimension of the review standard' },
    { title: 'Verify', detail: 'review-verifier tries to refute every finding' },
    { title: 'Package', detail: 'ui-packager builds the delivery folder on the Desktop' },
  ],
}

// ---------------------------------------------------------------------------
// Team
//   The agentTypes below were defined in .claude/agents/design-to-ui-implementation/,
//   which was removed on 2026-10-26. This script is kept for reference only and no
//   longer runs. The live team is .claude/agents/ui-implementation/, run by /build-ui.
// ---------------------------------------------------------------------------
// Inputs
//   figmaUrl        one of   Figma design URL with node-id
//   mockupPath      one of   path to a mockup image (PNG/JPG) when there is no Figma file
//   target          required  what to build and where (page, component, route)
//   standardsDir    optional  folder holding the two standard files (default: repo root)
//   specPath        optional  where the design spec is written (default: .claude/design-spec.md)
//   devServerUrl    optional  running app URL so the validator can render real screenshots
//   maxFidelityLoops optional default 3
//   maxReviewLoops   optional default 3
//   deliveryDir      optional  where the finished UI folder is created (default: $HOME/Desktop)
//   package          optional  set false to skip the delivery folder (default: true)
// ---------------------------------------------------------------------------
const a = args || {}
if (!(a.figmaUrl || a.mockupPath) || !a.target) {
  throw new Error('figma-to-ui needs args.target and either args.figmaUrl or args.mockupPath')
}
const designSource = a.figmaUrl
  ? `Figma URL: ${a.figmaUrl}`
  : `Mockup image: ${a.mockupPath} (no Figma file; extract from the image and mark every value with reduced confidence)`
const standardsDir = a.standardsDir || '.'
const DEV_STD = `${standardsDir}/uiux-development-standard.md`
const REVIEW_STD = `${standardsDir}/uiux-code-review-standard.md`
const specPath = a.specPath || '.claude/design-spec.md'
const devServerUrl = a.devServerUrl || null
const MAX_FIDELITY = typeof a.maxFidelityLoops === 'number' ? a.maxFidelityLoops : 3
const MAX_REVIEW = typeof a.maxReviewLoops === 'number' ? a.maxReviewLoops : 3
const deliveryDir = a.deliveryDir || '$HOME/Desktop'
const doPackage = a.package !== false

// ---------------------------------------------------------------------------
// Schemas: gates are decided in code from typed results, never from prose
// ---------------------------------------------------------------------------
const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    specPath: { type: 'string' },
    summary: { type: 'string' },
    newTokenCount: { type: 'number' },
    interactionCount: { type: 'number' },
    openQuestions: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
  },
  required: ['specPath', 'summary', 'openQuestions', 'blockers'],
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    filesChanged: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
    disputed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          finding: { type: 'string' },
          reason: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['finding', 'reason'],
      },
    },
  },
  required: ['filesChanged', 'summary', 'blockers'],
}

const FIDELITY_SCHEMA = {
  type: 'object',
  properties: {
    method: { type: 'string', enum: ['rendered', 'static'] },
    matches: { type: 'boolean' },
    deltas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          expected: { type: 'string' },
          actual: { type: 'string' },
          severity: { type: 'string', enum: ['blocking', 'minor'] },
          file: { type: 'string' },
        },
        required: ['area', 'expected', 'actual', 'severity'],
      },
    },
    specGaps: { type: 'array', items: { type: 'string' } },
    notChecked: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['method', 'matches', 'deltas', 'summary'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'number' },
          severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
          file: { type: 'string' },
          line: { type: 'number' },
          finding: { type: 'string' },
          why: { type: 'string' },
          recommendation: { type: 'string' },
          purposeChecked: { type: 'string' },
        },
        required: ['section', 'severity', 'file', 'line', 'finding', 'why', 'recommendation'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean' },
    adjustedSeverity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    reason: { type: 'string' },
    recommendationIssue: { type: 'string' },
  },
  required: ['confirmed', 'adjustedSeverity', 'reason'],
}

const PACKAGE_SCHEMA = {
  type: 'object',
  properties: {
    folder: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    previewMethod: { type: 'string', enum: ['copied', 'rendered-static', 'partial'] },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['folder', 'files', 'previewMethod', 'notes'],
}

const DIMENSIONS = [
  { key: 'structure', sections: 'sections 1 to 6 and 13 to 16: semantic HTML, unnecessary elements, DOM nesting, headings, classes, IDs, lists, tables, empty elements, br' },
  { key: 'accessibility', sections: 'sections 7 to 12 and 17 to 19: buttons vs links, button type, images and alt text, icon accessibility, forms, input types, ARIA, native vs custom, keyboard' },
  { key: 'consistency', sections: 'sections 20 and 21: inline styles and scripts, existing project consistency' },
]

const BLOCKING = new Set(['Critical', 'High'])
const fmt = (obj) => JSON.stringify(obj, null, 2)

// ---------------------------------------------------------------------------
// Team members, each a thin wrapper around a .claude/agents definition
// ---------------------------------------------------------------------------
const extract = () => agent(
  `Extract a design spec.
${designSource}
Project root: the current working directory
Write the spec to: ${specPath}
Development standard: ${DEV_STD}`,
  { agentType: 'design-extractor', label: 'extract:spec', phase: 'Extract', schema: SPEC_SCHEMA },
)

const build = () => agent(
  `mode: build
Design spec: ${specPath}
Development standard: ${DEV_STD}
target: ${a.target}
Do not commit. Return filesChanged, summary, blockers.`,
  { agentType: 'ui-builder', label: 'build:ui', phase: 'Build', schema: BUILD_SCHEMA },
)

const validate = (filesChanged, pass) => agent(
  `Validate the implementation against the design.
Design spec: ${specPath}
Development standard (read the Design Fidelity Tolerance section): ${DEV_STD}
${designSource}
Dev server URL: ${devServerUrl || 'none, use the static method and say so'}
Files changed by the builder:
${filesChanged.map((f) => `- ${f}`).join('\n')}`,
  { agentType: 'fidelity-validator', label: `validate:pass${pass}`, phase: 'Validate', schema: FIDELITY_SCHEMA },
)

const refine = (filesChanged, work, kind, pass) => agent(
  `mode: refine
Design spec: ${specPath}
Development standard: ${DEV_STD}
target: ${a.target}
Files you changed previously:
${filesChanged.map((f) => `- ${f}`).join('\n')}

${kind === 'fidelity'
    ? 'Fidelity deltas from design QA. Fix every blocking delta. Fix minor ones only when the change is trivial and local.'
    : 'Confirmed code review findings. Fix every Critical and High finding. Medium and Low are listed for context; fix them only when trivial and local. If you believe a finding is wrong, do not change code for it and return it under disputed with evidence.'}
${fmt(work)}

Do not refactor anything outside these items. Do not commit.`,
  { agentType: 'ui-builder', label: `refine:${kind}${pass}`, phase: 'Refine', schema: BUILD_SCHEMA },
)

const review = (filesChanged, dim, round) => agent(
  `Review this UI change for one dimension.
Review standard: ${REVIEW_STD}
dimension: ${dim.key} (${dim.sections})
Files to review:
${filesChanged.map((f) => `- ${f}`).join('\n')}
Return only findings that pass the section 25 false-positive test.`,
  { agentType: 'code-reviewer', label: `review:${dim.key}:r${round}`, phase: 'Review', schema: FINDINGS_SCHEMA },
)

const verify = (finding, dim, round) => agent(
  `Try to refute this code review finding.
Review standard: ${REVIEW_STD}
Finding:
${fmt(finding)}`,
  { agentType: 'review-verifier', label: `verify:${dim.key}:${finding.file}:${finding.line}`, phase: 'Verify', schema: VERDICT_SCHEMA },
)

const pack = (filesChanged, fidelityResult, reviewResult, disputedItems) => agent(
  `Package the approved UI into a delivery folder.
target: ${a.target}
Delivery root: ${deliveryDir}
Design spec: ${specPath}
Development standard (section 14 is the requirements checklist): ${DEV_STD}
Project files changed:
${filesChanged.map((f) => `- ${f}`).join('\n')}

Fidelity report (every unmatched item, blocking and minor; write FIDELITY-REPORT.md from it):
${fmt(fidelityResult)}

Review result:
${fmt(reviewResult)}

Disputed findings:
${fmt(disputedItems)}`,
  { agentType: 'ui-packager', label: 'package:delivery', phase: 'Package', schema: PACKAGE_SCHEMA },
)

// ---------------------------------------------------------------------------
// Gate 1: Matches design?  Loop: validate -> refine -> validate, capped
// ---------------------------------------------------------------------------
const mergeFiles = (list, more) => Array.from(new Set([...list, ...(more || [])]))

async function fidelityGate(filesChanged, tag) {
  let files = filesChanged
  let last = null
  const disputed = []
  for (let pass = 1; pass <= MAX_FIDELITY; pass++) {
    last = await validate(files, `${tag}${pass}`)
    if (!last) return { ok: false, files, last: null, disputed, reason: 'validator returned nothing' }
    const blocking = last.deltas.filter((d) => d.severity === 'blocking')
    log(`Fidelity ${tag}${pass}: method=${last.method} matches=${last.matches} blocking=${blocking.length} minor=${last.deltas.length - blocking.length}`)
    if (last.matches && blocking.length === 0) return { ok: true, files, last, disputed }
    if (pass === MAX_FIDELITY) {
      log(`Fidelity gate: ${MAX_FIDELITY} passes used, ${blocking.length} blocking deltas remain. Escalating to a human.`)
      return { ok: false, files, last, disputed, reason: 'fidelity loop cap reached' }
    }
    const fix = await refine(files, last.deltas, 'fidelity', `${tag}${pass}`)
    if (!fix) return { ok: false, files, last, disputed, reason: 'refiner returned nothing' }
    files = mergeFiles(files, fix.filesChanged)
    disputed.push(...(fix.disputed || []))
  }
  return { ok: false, files, last, disputed, reason: 'unreachable' }
}

// Design match report: every unmatched item, blocking and minor, never summarised away.
// perfectMatch is stricter than the gate: the gate passes with minor deltas, a perfect match has none.
const fidelityReport = (last) => {
  const deltas = (last && last.deltas) || []
  const blocking = deltas.filter((d) => d.severity === 'blocking')
  const minor = deltas.filter((d) => d.severity !== 'blocking')
  return {
    method: last ? last.method : 'none',
    perfectMatch: !!last && last.matches && deltas.length === 0,
    matchesWithinTolerance: !!last && last.matches && blocking.length === 0,
    unmatchedCount: deltas.length,
    blocking,
    minor,
    specGaps: (last && last.specGaps) || [],
    notChecked: (last && last.notChecked) || [],
    summary: last ? last.summary : 'validator returned nothing',
  }
}
const logMatch = (r) => log(r.perfectMatch
  ? `Design match: perfect, zero unmatched items (${r.method}).`
  : `Design match: ${r.unmatchedCount} unmatched item(s), ${r.blocking.length} blocking, ${r.minor.length} minor (${r.method}).`)

// ---------------------------------------------------------------------------
// Gate 2: Approved?  Three reviewers in parallel, every finding verified,
// Critical/High confirmed findings reject. Each dimension's findings go to
// verification as soon as that reviewer finishes (pipeline, no barrier).
// ---------------------------------------------------------------------------
async function reviewRound(filesChanged, round) {
  const perDimension = await pipeline(
    DIMENSIONS,
    (dim) => review(filesChanged, dim, round),
    (result, dim) => {
      const findings = (result && result.findings) || []
      if (!findings.length) return []
      return parallel(findings.map((f) => () =>
        verify(f, dim, round).then((v) => (v ? { ...f, verdict: v, dimension: dim.key } : null)),
      ))
    },
  )
  const all = perDimension.filter(Boolean).flat().filter(Boolean)
  const confirmed = all
    .filter((f) => f.verdict.confirmed)
    .map((f) => ({ ...f, severity: f.verdict.adjustedSeverity }))
  const refuted = all.filter((f) => !f.verdict.confirmed)
  return { confirmed, refuted }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
phase('Extract')
const spec = await extract()
if (!spec) throw new Error('design-extractor returned nothing')
if (spec.blockers.length) {
  log(`Extraction blocked: ${spec.blockers.join('; ')}`)
  return { status: 'blocked', stage: 'extract', spec }
}
log(`Spec written to ${spec.specPath}. NEW tokens: ${spec.newTokenCount ?? 'n/a'}. Prototype reactions: ${spec.interactionCount ?? 'not read'}. Open questions: ${spec.openQuestions.length}.`)

phase('Build')
const built = await build()
if (!built) throw new Error('ui-builder returned nothing')
let files = built.filesChanged
const blockers = [...built.blockers]
const disputed = []
log(`Built ${files.length} files. Blockers: ${blockers.length}.`)

let fidelity = await fidelityGate(files, 'f')
files = fidelity.files
disputed.push(...fidelity.disputed)
if (!fidelity.ok) {
  logMatch(fidelityReport(fidelity.last))
  return {
    status: 'escalated',
    stage: 'fidelity',
    reason: fidelity.reason,
    filesChanged: files,
    fidelity: fidelityReport(fidelity.last),
    specOpenQuestions: spec.openQuestions,
    blockers,
    disputed,
    nextStep: 'A human decides whether the remaining deltas are acceptable or the spec needs changing.',
  }
}

let approved = false
let lastReview = { confirmed: [], refuted: [] }
for (let round = 1; round <= MAX_REVIEW; round++) {
  lastReview = await reviewRound(files, round)
  const blocking = lastReview.confirmed.filter((f) => BLOCKING.has(f.severity))
  const advisory = lastReview.confirmed.filter((f) => !BLOCKING.has(f.severity))
  log(`Review round ${round}: confirmed=${lastReview.confirmed.length} (blocking=${blocking.length}, advisory=${advisory.length}) refuted=${lastReview.refuted.length}`)
  if (!blocking.length) { approved = true; break }
  if (round === MAX_REVIEW) {
    log(`Review gate: ${MAX_REVIEW} rounds used, ${blocking.length} blocking findings remain. Escalating to a human.`)
    break
  }
  const fix = await refine(files, lastReview.confirmed, 'review', `r${round}`)
  if (!fix) break
  files = mergeFiles(files, fix.filesChanged)
  disputed.push(...(fix.disputed || []))
  // Fixing review findings can move pixels, so the build goes back through design QA
  fidelity = await fidelityGate(files, `r${round}f`)
  files = fidelity.files
  disputed.push(...fidelity.disputed)
  if (!fidelity.ok) {
    logMatch(fidelityReport(fidelity.last))
    return {
      status: 'escalated',
      stage: 'fidelity-after-review',
      reason: fidelity.reason,
      filesChanged: files,
      fidelity: fidelityReport(fidelity.last),
      review: lastReview,
      blockers,
      disputed,
      nextStep: 'A human decides whether the remaining deltas are acceptable or the spec needs changing.',
    }
  }
}

log(approved
  ? 'Both gates passed. The workflow does not commit or open a PR; a human does the final sign-off.'
  : 'Review gate did not pass within the loop cap. Handing to a human.')

const fidelitySummary = fidelityReport(fidelity.last)
logMatch(fidelitySummary)
const reviewSummary = {
  blocking: lastReview.confirmed.filter((f) => BLOCKING.has(f.severity)),
  advisory: lastReview.confirmed.filter((f) => !BLOCKING.has(f.severity)),
  refutedCount: lastReview.refuted.length,
}

let delivery = null
if (approved && doPackage) {
  phase('Package')
  delivery = await pack(files, fidelitySummary, reviewSummary, disputed)
  log(delivery ? `Delivery folder: ${delivery.folder} (${delivery.previewMethod})` : 'Packager returned nothing; no delivery folder was created.')
} else if (approved) {
  log('Packaging skipped by args.package=false.')
}

return {
  status: approved ? 'ready-for-human-review' : 'escalated',
  stage: approved ? 'done' : 'review',
  filesChanged: files,
  fidelity: fidelitySummary,
  review: reviewSummary,
  delivery,
  specOpenQuestions: spec.openQuestions,
  blockers,
  disputed,
  nextStep: approved
    ? 'Human reviews the diff and the delivery folder, the advisory findings, and any disputed items, then commits and opens the PR.'
    : 'Human resolves the remaining blocking findings or disputed items.',
}
