# MirraAI Demo QA Runbook

Use this document to validate all critical flows before recording the hackathon demo video.

## 1) QA Goal

Confirm that a new user can complete the core lifestyle journey end-to-end:

1. Landing page
2. Sign in
3. Selfie capture + skin analysis
4. Dashboard
5. Skin flows
6. GlowUp flows
7. Closet flows
8. Outfit + Proof Card flow
9. Try-On Studio (full-body + face-based)
10. Look Diary / history checks

If all pass, proceed to final demo recording.

---

## 2) Pre-QA Setup (Do This First)

- [ ] Use production demo URL: `https://mirra-ai-ten.vercel.app`
- [ ] Open in Chrome mobile emulation (or real phone) for realistic demo behavior.
- [ ] Clear browser state:
  - [ ] Clear site data for Vercel domain
  - [ ] Hard refresh
- [ ] Ensure backend is healthy:
  - [ ] `https://mirra-ai-j8erd.ondigitalocean.app/health`
- [ ] Sign in with a dedicated demo account.
- [ ] Confirm the account has:
  - [ ] At least 1 selfie scan baseline (or be ready to create one)
  - [ ] Ability to upload closet images
- [ ] Prepare assets:
  - [ ] 1 clear portrait selfie (for skin + face try-on)
  - [ ] 1 full-body portrait image (for clothes try-on)
  - [ ] 5-10 closet item images (tops, bottoms, shoes, accessories)

---

## 3) Smoke Test Matrix (Pass/Fail Snapshot)

Run this first. If any item fails, fix before deep QA.

- [ ] Landing page loads without errors
- [ ] Google sign-in completes and routes correctly
- [ ] `/capture` works and submits selfie
- [ ] Skin analysis completes and routes to `/dashboard`
- [ ] `/skin` page loads scores
- [ ] `/glowup` page loads analysis/recommendations
- [ ] `/closet` page loads and allows upload
- [ ] `/outfit` page loads and can generate proof card
- [ ] `/try-on` works for full-body clothes and selfie-based accessories
- [ ] `/look-diary` loads saved cards/history

---

## 4) Detailed QA Steps (Exact Flow)

## Flow A: Landing + Auth

### Steps
- [ ] Open `/`
- [ ] Verify hero section, feature sections, and CTA buttons render.
- [ ] Click **Try Now** (or **Open Dashboard** if already signed in).
- [ ] Complete Google OAuth.

### Expected
- User returns to app without auth errors.
- New/unonboarded user is sent to `/capture`.
- Onboarded user is sent to `/dashboard`.
- No redirect loop back to `/`.

### Fail If
- OAuth completes but user bounces to landing.
- Any 401 loop appears in console for initial page data.

---

## Flow B: Selfie Capture + Skin Analysis

### Steps
- [ ] On `/capture`, allow camera permission.
- [ ] Capture a clear selfie.
- [ ] Submit and watch analysis stages:
  - [ ] Preparing selfie
  - [ ] Running Perfect Corp analysis
  - [ ] Saving scan
  - [ ] Opening dashboard

### Expected
- Analysis completes without timeout.
- User lands on `/dashboard`.
- Baseline skin data persists (refresh dashboard and confirm still present).

### Fail If
- Analysis stalls/fails repeatedly.
- Dashboard loads but no skin data appears.

---

## Flow C: Dashboard

### Steps
- [ ] Verify dashboard sections/cards load.
- [ ] Check quick actions/navigation to:
  - [ ] Skin
  - [ ] GlowUp
  - [ ] Closet
  - [ ] Try-On

### Expected
- No broken cards/loading spinners stuck.
- Navigation works from dashboard to each core flow.

---

## Flow D: Skin Hub

### Steps
- [ ] Go to `/skin`.
- [ ] Verify skin concern scores and summary render.
- [ ] Open `/skin-history` and confirm at least 1 scan record.
- [ ] Open `/skin/simulate`, run one simulation.

### Expected
- Scores are visible and non-empty.
- History shows recent scans with timestamps.
- Simulation returns a result image/state.

### Fail If
- Empty/error states for known scan data.
- Simulation fails silently.

---

## Flow E: GlowUp

### Steps
- [ ] Go to `/glowup`.
- [ ] Run analysis/recommendation step.
- [ ] Try at least one suggested makeup or hairstyle option.

### Expected
- Face/tone-aware recommendations appear.
- Applying a style updates preview successfully.

### Fail If
- Recommendations fail to generate.
- Try-on action does nothing or errors.

---

## Flow F: Closet

### Steps
- [ ] Go to `/closet`.
- [ ] Upload 3-5 closet item photos.
- [ ] Confirm items appear in list/grid.
- [ ] If metadata extraction is available, verify category/color tags populate.

### Expected
- Upload succeeds for each item.
- Items persist after refresh.
- Closet count reflects additions.

### Fail If
- Upload appears successful but item is missing after refresh.

---

## Flow G: Outfit Builder + Proof Card

### Steps
- [ ] Go to `/outfit`.
- [ ] Pick an occasion.
- [ ] Generate outfit match/recommendation.
- [ ] Generate proof card.
- [ ] Validate proof card fields:
  - [ ] Tone match
  - [ ] Style fit
  - [ ] Skin safe
  - [ ] Cost breakdown
- [ ] Click **Approve/Save** and check persistence.

### Expected
- Proof card generates with complete data.
- Approve/save action updates UI state and persists.

### Fail If
- Proof card missing key fields.
- Save action does not persist to Look Diary.

---

## Flow H: Try-On Studio (Critical for Demo)

### Steps
- [ ] Go to `/try-on`.
- [ ] Confirm selfie is available for face-based tabs.
- [ ] Capture/upload full-body image for clothes try-on.
- [ ] Run clothes VTO using full-body image.
- [ ] Switch to face-based tabs and run:
  - [ ] Makeup
  - [ ] Hair
  - [ ] Earrings or Necklace

### Expected
- Clothes VTO uses full-body source.
- Makeup/hair/accessories use selfie source.
- Result preview updates correctly on each action.

### Fail If
- Clothes VTO runs without full-body image (wrong behavior).
- Face tabs break after switching from clothes.

---

## Flow I: Look Diary + Outfit History

### Steps
- [ ] Go to `/look-diary`.
- [ ] Verify approved proof cards appear.
- [ ] Confirm score/cost fields are displayed correctly.
- [ ] Check `/outfit-history` if used in demo.

### Expected
- Saved cards are visible after refresh.
- Data mapping is correct (no swapped/missing fields).

---

## 5) Demo Recording Readiness Checklist

Only start recording when all are true:

- [ ] Auth is stable (no redirect loop)
- [ ] Selfie capture + skin analysis works first try
- [ ] GlowUp has at least one working effect to showcase
- [ ] Closet has enough items for outfit match
- [ ] Full-body image is prepared for clothes VTO
- [ ] Proof card generation + save works
- [ ] Look Diary shows at least one approved look
- [ ] No visible console errors in critical demo path

---

## 6) Recommended Demo Path (Fast, Reliable)

Use this exact path while recording:

- [ ] Landing page (5-10s)
- [ ] Sign in (10-15s)
- [ ] Capture selfie + analysis result (25-35s)
- [ ] Skin page + quick history/simulation (25-35s)
- [ ] GlowUp recommendation + one try-on (20-30s)
- [ ] Closet quick view (10-15s)
- [ ] Outfit builder + proof card generation (30-40s)
- [ ] Try-On Studio:
  - [ ] full-body clothes VTO
  - [ ] selfie-based accessory/makeup (30-45s)
- [ ] Look Diary showing saved outcome (10-15s)

Target video length: 3:00 to 3:50.

---

## 7) Bug Logging Template (During QA)

For each bug, log:

- **Title**:
- **Flow** (A-I):
- **URL**:
- **Steps to reproduce**:
- **Expected**:
- **Actual**:
- **Severity** (Blocker/High/Medium/Low):
- **Screenshot/Screen recording**:

Blockers for recording:
- Auth failure
- Analysis failure
- Proof card not generating
- Try-on not rendering

