# Perfect Corp API Source Of Truth

Updated: May 5, 2026

This document is Mirra's working source of truth for Perfect Corp API usage. Keep it implementation-oriented: what the API owns, what Gemini owns, what the UI should show, and what failure cases need to be translated for users.

## Architecture Boundary

Perfect Corp is the deterministic visual and analysis engine:

- Skin analysis, skin tone, face attributes, face ratios.
- Skin simulation and visual before/after images.
- Clothes, makeup, hair, earrings, necklace, and other VTO render outputs.
- Product/reference image validation during VTO task execution.

Gemini is the reasoning and orchestration layer:

- Convert Perfect Corp scores, tones, face attributes, weather, closet, calendar, and history into structured plans.
- Decide which skin concern should drive product search.
- Explain why a makeup, hair, accessory, or outfit choice fits the user.
- Produce strict JSON only, so the frontend renders deterministic cards, steps, recommendations, proof cards, and CTAs.

Serper is product discovery. Supabase is persistence for scans, profiles, closet, proof cards, and archived output images.

## Global Perfect Corp Workflow

Most Perfect Corp APIs use the same async pattern:

1. Create file metadata:
   - `POST /s2s/{version}/file/{feature}`
   - Returns `file_id` and a pre-signed upload request.
2. Upload bytes to the returned URL:
   - Use the exact `method`, `url`, and headers returned by Perfect Corp.
   - Calling the File API alone does not upload the file.
3. Create an AI task:
   - `POST /s2s/{version}/task/{feature}`
   - Use `src_file_id`, `src_file_url`, `ref_file_id`, `ref_file_url`, `template_id`, or feature-specific parameters.
   - Returns `task_id`.
4. Poll task status:
   - `GET /s2s/{version}/task/{feature}/{task_id}`
   - Continue until `data.task_status` is `success` or `error`.
   - Do not stop polling beyond the retention window. Later status checks can return `InvalidTaskId`, and units may already be consumed.
5. Persist useful output:
   - Success responses usually return `data.results.url` or analysis JSON.
   - Result URLs are often TTL/pre-signed URLs. For durable look diary/proof cards, copy final images into Supabase Storage or another stable public storage layer.

Auth:

- Header: `Authorization: Bearer YOUR_API_KEY`
- This is a backend secret. Never expose Perfect Corp credentials to the frontend.

Billing:

- Units are consumed when a task succeeds.
- Running tasks do not consume units.
- Failed engine tasks generally do not consume units.
- Unit balance endpoint: `GET /s2s/v1.0/client/credit`
- Unit history endpoint: `GET /s2s/v1.0/client/credit/history`

## Mirra Priority APIs

These are the APIs that matter for the hackathon user experience.

| Area | API | Endpoint family | Mirra use |
|---|---|---|---|
| Skin | Skin Analysis | `/skin-analysis` | Skin score grid, skin age, concern ranking, masks |
| Skin | Skin Tone Analysis | `/skin-tone-analysis` | Undertone, skin color, shade matching |
| Face | Face Attributes | `/face-attr-analysis` | Face shape, eye/brow/lip/nose/cheekbone features |
| Skin | Skin Simulation | `/skin-simulation` | Before/after treatment visualization |
| Clothes | Clothes VTO v3 | `/cloth-v3` | Outfit and product try-on |
| Makeup | Makeup VTO | `/makeup-vto` | Deterministic makeup effects |
| Hair | Hair Transfer | `/hair-transfer` | Reference/template hairstyle try-on |
| Jewelry | Earrings VTO | `/2d-vto/earring` | Accessory try-on |
| Jewelry | Necklace VTO | `/2d-vto/necklace` | Accessory try-on |

Secondary APIs are useful after the core flow is reliable: Look VTO, Makeup Transfer, Hair Color, Hair Type/Length/Frizz/Density detection, Hat, Scarf, Bag, Shoes, Fabric, Nail, Ring, Bracelet, Watch, Teeth Whitening, Eye Color Lens, Aging, Face Reshape, and Body Reshape.

## Skin And Face Analysis

### Skin Analysis

Recommended version:

- `POST /s2s/v2.1/file/skin-analysis`
- `POST /s2s/v2.1/task/skin-analysis`
- `GET /s2s/v2.1/task/skin-analysis/{task_id}`

v2.0 also exists, but v2.1 raises the max input resolution to 4096.

Inputs:

- `src_file_id` or `src_file_url`
- `dst_actions`: selected concerns
- `format`: `json` for structured UI rendering
- Optional `miniserver_args`, including mask overlay behavior

Image requirements:

- SD: long side <= 4096, short side >= 480, file < 10 MB, jpg/jpeg/png.
- HD: long side <= 4096, short side >= 1080, file < 10 MB, jpg/jpeg/png.
- Face should be front-facing, centered, well lit, unobstructed, eyes open, mouth closed, forehead visible.
- Face width should be greater than 60% of the image width.
- Prefer portrait images.

SD concerns:

- `wrinkle`
- `droopy_upper_eyelid`
- `droopy_lower_eyelid`
- `firmness`
- `acne`
- `moisture`
- `eye_bag`
- `dark_circle_v2`
- `age_spot`
- `radiance`
- `redness`
- `oiliness`
- `pore`
- `texture`

HD concerns:

- `hd_redness`
- `hd_oiliness`
- `hd_age_spot`
- `hd_radiance`
- `hd_moisture`
- `hd_dark_circle`
- `hd_eye_bag`
- `hd_droopy_upper_eyelid`
- `hd_droopy_lower_eyelid`
- `hd_firmness`
- `hd_texture`
- `hd_acne`
- `hd_pore`
- `hd_wrinkle`
- Some docs/examples also mention HD extensions such as tear trough and skin type; verify against the live API before enabling in UI.

Important constraints:

- Do not mix SD and HD `dst_actions` in one request.
- Invalid or misspelled concerns return `InvalidParameters`.

Outputs:

- Per concern: `raw_score`, `ui_score`, `output_mask_name` or `mask_urls`.
- Overall: `all.score`.
- Skin age: `skin_age`.
- HD pore regions: forehead, nose, cheek, whole.
- HD wrinkle regions: forehead, glabellar, crowfeet, periocular, nasolabial, marionette, whole.

Mirra UI:

- Show `ui_score` to users.
- Preserve `raw_score` for trend logic and internal ranking.
- Surface masks as optional overlays, not mandatory.
- Rank lowest scores as top concerns.
- Convert technical capture failures into selfie guidance.

Gemini should:

- Explain the top 1-3 concerns in plain language.
- Combine scores with humidity, UV, history, and product history.
- Choose the product search concern and ingredient target.
- Return structured JSON for insight cards.

### Skin Simulation

Endpoints:

- `POST /s2s/v2.0/file/skin-simulation`
- `POST /s2s/v2.0/task/skin-simulation`
- `GET /s2s/v2.0/task/skin-simulation/{task_id}`

Inputs:

- `src_file_id` or `src_file_url`
- Concern intensities from `0.0` to `1.0`
- At least one intensity must be greater than zero.

Effect semantics:

- `0.0`: original appearance.
- `0.1` to `0.3`: subtle refinement.
- `0.4` to `0.6`: balanced improvement.
- `0.7` to `1.0`: strongest natural-looking improvement.

Supported concerns include:

- wrinkles
- radiance
- acne
- oiliness
- eye bags
- dark circles
- spots
- pores
- texture
- redness

Image requirements:

- short side >= 480, long side <= 2560, file < 10 MB, jpg/jpeg/png.
- Front-facing, even lighting, fully visible face, no tinted lighting, no occlusions.
- Face should occupy at least 60% of image width.

Mirra UI:

- Before/after slider.
- Concern sliders.
- Auto-fill intensities from low skin scores, with user override.
- Save output to look diary/proof card storage.

Gemini should:

- Explain why each simulated concern was selected.
- Avoid medical claims. Present as visual preview, not guaranteed treatment result.

### Skin Tone Analysis

Endpoints:

- `POST /s2s/v2.0/file/skin-tone-analysis`
- `POST /s2s/v2.0/task/skin-tone-analysis`
- `GET /s2s/v2.0/task/skin-tone-analysis/{task_id}`

Inputs:

- `src_file_id` or `src_file_url`
- Optional `face_angle_strictness_level`: strict, high, medium, low, flexible. Default is high.

Image requirements:

- long side <= 4096.
- Single person only.
- jpg/jpeg.
- Images over 1080px on one side may be resized automatically for analysis.
- Face must be forward-facing, centered, and fully visible.

Outputs:

- `skin_color`: hex color.
- Broader docs describe facial color detection for skin, eye, eyebrow, lip, and hair colors.
- Current implementation should normalize whatever Perfect Corp returns into Mirra's `body_model` fields.

Mirra UI:

- Skin tone swatch.
- Undertone/depth labels.
- Palette chips for makeup and accessories.

Gemini should:

- Map tone/undertone to makeup palette recommendations.
- Explain shade and metal choices without inventing unavailable Perfect Corp fields.

### Face Attributes And Ratio Analysis

Endpoints:

- `POST /s2s/v2.0/file/face-attr-analysis`
- `POST /s2s/v2.0/task/face-attr-analysis`
- `GET /s2s/v2.0/task/face-attr-analysis/{task_id}`

Requestable attributes:

- Face: `faceShape`
- Age/gender: `age`, `gender`
- Eyes: `eyeShape`, `eyeSize`, `eyeAngle`, `eyeDistance`, `eyelid`
- Brows: `eyebrowShape`, `eyebrowThickness`, `eyebrowDistance`, `eyebrowShortness`
- Lips: `lipShape`
- Nose: `noseWidth`, `noseLength`
- Cheekbones: `cheekbones`
- Colors: `eyeColor`, `lipColor`, `eyebrowColor`, `hairColor`
- Ratios: `horizontalThird`, `verticalFifth`, `faceAspectRatio`, `eyeAspectRatio`, `eyebrowArch`, `eyeHeightToEyebrowDistance`, `noseAspectRatio`, `noseWidthToMouthWidth`, `noseToLipToChin`, `upperLipToLowerLip`

Outputs:

- Face shape: Triangle, Diamond, Heart, InvTriangle, Oblong, Oval, Round, Square, Unknown.
- Eye shape: Narrow, Round, Almond.
- Eye size: Big, Small, Average.
- Eye angle: Downturned, Upturned, Average.
- Eye distance: Close-set, Wide-Set, Average.
- Eyelid: Hooded-lid, Single-lid, Double-lid, Deep-Set.
- Brow shape: Hard Angled, Soft Angled, Straight, Rounded, Obscured.
- Brow thickness: Dense, Sparse, Average, Unknown.
- Brow distance: Far-Apart, Close, Average.
- Lip shape: Bow, Downturned, Full, Heavy Lower Lip, Heavy Upper Lip, Narrow, Round, Thin, Wide, Average.
- Nose width/length: Narrow/Broad/Average and Long/Short/Average.
- Cheekbones: Flat Cheekbone, High Cheekbone, Low Cheekbone, Round Cheeks.
- Colors as hex plus names where supported.

Image requirements:

- long side <= 4096.
- Single person only.
- jpg/jpeg.
- Source image dimensions at least 320px.
- Front-facing, fully visible, centered.

Mirra UI:

- Face profile card.
- Face-shape and undertone reasoning for makeup, hair, earrings, and necklace.

Gemini should:

- Convert face attributes into style rules.
- Return only structured recommendations. Do not ask the model to alter images.

## Makeup APIs

### Makeup Virtual Try-On

Endpoints:

- `POST /s2s/v2.0/file/makeup-vto`
- `POST /s2s/v2.0/task/makeup-vto`
- `GET /s2s/v2.0/task/makeup-vto/{task_id}`

Inputs:

- `src_file_id` or `src_file_url`
- `version`: optional string, default `"1.0"` (effect spec version).
- `effects`: array of makeup effect objects. Each object **`category` is a snake_case string** matching the Perfect Corp Makeup task schema (not display names with spaces).

Minimal examples — real payloads are stricter per category (required palette keys differ).

```json
{
  "category": "blush",
  "pattern": { "name": "1color1" },
  "palettes": [
    { "color": "#FF0000", "texture": "matte", "colorIntensity": 50 }
  ]
}
```

**API `category` values (const strings):**

- `skin_smooth` — top-level `skinSmoothStrength`, `skinSmoothColorIntensity` (0–100); not a palette effect.
- `blush` — `pattern.name` must be a **`label` from** [blush.json](https://plugins-media.makeupar.com/wcm-saas/patterns/blush.json). `palettes` count must match pattern `colorNum`. Texture enum: `matte`, `satin`, `shimmer` (satin/shimmer add required fields per docs).
- `bronzer`, `contour`, `highlighter` — pattern catalogs: [bronzer](https://plugins-media.makeupar.com/wcm-saas/patterns/bronzer.json), [contour](https://plugins-media.makeupar.com/wcm-saas/patterns/contour.json), [highlighter](https://plugins-media.makeupar.com/wcm-saas/patterns/highlighter.json).
- `concealer` — palettes require `colorUnderEyeIntensity`, `coverageLevel`, etc.
- `eyebrows` — `pattern` includes `type` (`shape` / `color`) and shape sliders; palette textures: `matte`, `shimmer`.
- `eye_liner` — [eyeliner.json](https://plugins-media.makeupar.com/wcm-saas/patterns/eyeliner.json); palette textures: `matte`, `shimmer`, `metallic`.
- `eye_shadow` — [eyeshadow.json](https://plugins-media.makeupar.com/wcm-saas/patterns/eyeshadow.json); same palette texture enum as eye liner.
- `eyelashes` — [eyelashes.json](https://plugins-media.makeupar.com/wcm-saas/patterns/eyelashes.json).
- `foundation` — palettes require `glowIntensity`, `coverageIntensity`, not only `colorIntensity`.
- `highlighter` — palettes require glow + shimmer fields (`glowIntensity`, `shimmerIntensity`, `shimmerDensity`, `shimmerSize`, …).
- `lip_color` — `shape.name` from [lipshape.json](https://plugins-media.makeupar.com/wcm-saas/shapes/lipshape.json), `style.type` (`full` / `ombre` / `twoTone`), `morphology` optional; palette textures: `matte`, `gloss`, `holographic`, `metallic`, `satin`, `sheer`, `shimmer` with category-specific required extras (`gloss`, `transparencyIntensity`, shimmer fields, …).
- `lip_liner` — [lipliner.json](https://plugins-media.makeupar.com/wcm-saas/patterns/lipliner.json); palette textures: `matte`, `satin`, plus `thickness`, `smoothness`.

**Mirra backend:** UI presets may use friendly names (`lipstick`, `eyeshadow`, `eyeliner`, …). The server **normalizes** these to the API snake_case categories and fills required palette fields before calling Perfect Corp. Pattern names in presets must be valid catalog `label` values unless using Mirra defaults.

**Image constraints (makeup-vto):** long side &lt; 1920, face width ≥ 100px, &lt; 10 MB, jpg/jpeg/png (see Perfect Corp Makeup VTO error table in their reference).

Mirra UI:

- Deterministic preset cards.
- Editable effect stack.
- Side-by-side compare.
- Save as proof card or diary entry.

Gemini should:

- Choose preset/effect JSON from skin tone, undertone, face attributes, event, and user preference.
- Never produce free-form image prompts for makeup VTO.

### Makeup Transfer

Endpoints:

- `POST /s2s/v2.0/file/mu-transfer`
- `POST /s2s/v2.0/task/mu-transfer`
- `GET /s2s/v2.0/task/mu-transfer/{task_id}`

Inputs:

- Target user image.
- Reference makeup image.

Image requirements:

- 1024x1024 recommended, long side <= 1024.
- Single face only.
- Full face visible.
- jpg/jpeg/png, file < 10 MB.

Common errors:

- `error_src_no_face`
- `error_ref_no_face`
- `error_src_face_too_small`
- `error_ref_face_too_small`
- `error_src_large_face_angle`
- `error_ref_large_face_angle`
- `error_src_eye_closed`
- `error_ref_eye_closed`
- `error_src_eye_occluded`
- `error_ref_eye_occluded`
- `error_src_lip_occluded`
- `error_ref_lip_occluded`
- `error_inappropriate_ref_case01`
- `error_inappropriate_ref_case02`

Mirra use:

- Future "copy this look" flow.
- Less deterministic than curated Makeup VTO presets, so not the first demo dependency.

### Look VTO

Endpoints:

- `POST /s2s/v2.0/file/look-vto`
- `GET /s2s/v2.0/task/template/look-vto`
- `POST /s2s/v2.0/task/look-vto`
- `GET /s2s/v2.0/task/look-vto/{task_id}`

Use:

- Fast demo-ready whole-look makeup templates.
- Good fallback when handcrafted makeup effect JSON is too brittle.

## Hair APIs

### Hair Transfer

Recommended version:

- `POST /s2s/v2.1/file/hair-transfer`
- `GET /s2s/v2.1/task/template/hair-transfer`
- `POST /s2s/v2.1/task/hair-transfer`
- `GET /s2s/v2.1/task/hair-transfer/{task_id}`

Inputs:

- `src_file_id` or `src_file_url`
- One of `ref_file_id`, `ref_file_url`, or `template_id`

Image requirements:

- long side <= 1024.
- jpg/jpeg/png.
- Single face.
- Face width >= 128px.
- Face pose: pitch, yaw, and roll within supported limits.
- Upper body should include shoulders.
- Hair should be visible enough for transfer.

Common errors:

- `error_no_face`
- `error_multiple_faces`
- `error_large_face_angle`
- `error_face_out_of_boundary`
- `error_no_shoulder`
- `error_insufficient_facial_landmark`
- `error_invalid_hair_length`
- `error_invalid_face_pose`
- `error_download_image`
- `exceed_max_filesize`
- `invalid_parameter`
- `unknown_internal_error`

Mirra UI:

- Template/reference picker.
- "Works best with shoulders visible" capture guidance.
- Save output to proof card.

Gemini should:

- Recommend styles from face shape, hair color, outfit context, and event.
- Explain the recommendation; Perfect Corp renders the image.

### Hair Color

Endpoints:

- `POST /s2s/v2.0/file/hair-color`
- `POST /s2s/v2.0/task/hair-color`
- `GET /s2s/v2.0/task/hair-color/{task_id}`

Use:

- Future hair color try-on from preset or custom palettes.

Important constraints:

- long side < 1920.
- Face width >= 100px.
- Single face, face visible, valid hair area.

### Hair Detection APIs

Detection APIs are best for future haircare recommendation flows.

| API | Endpoint family | Input | Output |
|---|---|---|---|
| Hair Type Detection | `/hair-type-detection` | 3 photos: front, left, right | Type 1A-4C mapping and term |
| Hair Length Detection | `/hair-length-detection` | Hair image | Hair length result |
| Hair Frizziness Detection | `/hair-frizziness-detection` | 3 photos: front, left, right | 0-3 mapping: Not Frizzy to Extreme Frizzy |
| Hair Density Detection | `/hair-density-detection` | Lowered-head selfie | Level 1-4 density |

Other future hair VTO APIs:

- Hair Extension: `/hair-ext`
- Bangs: `/hair-bang`
- Hair Volume: `/hair-vol`
- Wavy Hair: `/hair-curl`
- Beard Style: `/beard-style`

## Clothes And Fashion VTO

### Clothes VTO v3

Endpoints:

- `POST /s2s/v2.0/file/cloth-v3`
- `POST /s2s/v2.0/task/cloth-v3`
- `GET /s2s/v2.0/task/cloth-v3/{task_id}`

Inputs:

- User image: `src_file_id` or `src_file_url`
- Outfit/reference: `ref_file_id`, `ref_file_url`, or `template_id`
- `garment_category`, such as `full_body` in docs examples.

Implementation note:

- Verify live allowed `garment_category` values before exposing them. Our UI/category names should map to provider values through a backend contract, not directly from UI strings.

Target user image requirements:

- 1024 x 768 recommended.
- 512 x 384 minimum.
- Max side 4096px.
- Single person only.
- Person should occupy at least 80% of the frame for best results.
- Face fully visible and unobstructed.
- Shoulders visible.
- Body facing forward and standing, not sitting or crouching.

Reference image requirements:

- 1024 x 768 recommended.
- 512 x 384 minimum.
- Max side 4096px.
- Product image must be front-facing and contain a single garment.
- Do not use composite product images.
- If using a worn reference image, it must contain one person and fully cover the intended try-on area.
- For lower body, standalone product images are not supported; use actual worn outfits.

Common preprocess errors:

- `exceed_max_filesize`
- `error_below_min_image_size`
- `error_pose`
- `error_invalid_ref`
- `error_apply_region_mismatch`
- `error_invalid_src`

Common engine errors:

- `invalid_parameter`
- `error_download_image`
- `exceed_max_filesize`
- `error_nsfw_content_detected`
- `error_editing_failed`
- `unknown_internal_error`

Mirra UI:

- Product/reference resolver status before calling Perfect Corp.
- Clear capture guidance for body/shoulders/face.
- Compare original and VTO result.
- Persist final result into proof cards, not only local download.

Gemini should:

- Decide outfit reasoning from closet, weather, calendar, skin tone, style preferences, and VTO result metadata.
- Not generate clothes images.

### Fabric

Endpoints:

- `POST /s2s/v2.0/file/fabric`
- `GET /s2s/v2.0/task/template/fabric`
- `POST /s2s/v2.0/task/fabric`
- `GET /s2s/v2.0/task/fabric/{task_id}`

Use:

- Future fabric/style transformation with predefined templates.

Constraints:

- long side <= 4096.
- Single person.
- Abdomen, face, and shoulders visible.
- Upright, forward-facing, no sitting/squatting.
- jpg/jpeg.

### Hat, Scarf, Bag, Shoes

These are fashion VTO expansion APIs with similar flow:

| API | Endpoint family | Required inputs | Output size |
|---|---|---|---|
| Hat | `/hat` | selfie, hat ref, `gender`, `style` | 896 x 1152 |
| Scarf | `/scarf` | selfie, scarf ref, `gender`, `style` | 896 x 1152 |
| Bag | `/bag` | selfie, bag ref, `gender`, `style` | 1104 x 1472 |
| Shoes | `/shoes` | selfie/body image, shoes ref, `gender`, `style` | 1008 x 1344 |

Shared constraints:

- Input long side <= 4096.
- File < 10 MB.
- jpg/jpeg/png/heic depending feature.
- Source image should contain one human subject, face visible, at least head-to-chest framing.
- Product images should show one clear item occupying enough image area.

Common errors:

- `error_download_image`
- `error_inference`
- `error_no_face`
- `error_nsfw_content_detected`
- `exceed_max_filesize`
- `invalid_parameter`
- `unknown_internal_error`

Use:

- Not core for the current hackathon unless clothes/accessories are already stable.

## Jewelry And Accessory VTO

### Earrings

Endpoints:

- `POST /s2s/v2.0/file/2d-vto/earring`
- `POST /s2s/v2.0/task/2d-vto/earring`
- `GET /s2s/v2.0/task/2d-vto/earring/{task_id}`

Inputs:

- User image: `src_file_id` or `src_file_url`
- Earring image: `ref_file_ids` or `ref_file_urls`
- Optional masks: `srcmsk_file_id`, `srcmsk_file_url`, `refmsk_file_ids`, `refmsk_file_urls`
- Optional parameters:
  - `earring_wearing_location`: integer array of size 2
  - `earring_scale`: number > 0
  - `earring_is_right_ear`: boolean
  - `earring_occluded_type`: 0 auto, 1 occluded, 2 no occlusion
  - `earring_shadow_intensity`: 0.0 to 1.0, default 0.15
  - `earring_ambient_light_intensity`: 0.0 to 1.0, default 1.0
  - `earring_anchor_point`: one pixel coordinate point

Requirements:

- long side <= 4096.
- file < 10 MB.
- jpg/jpeg/png.
- Best results with side-facing selfie; front-facing is supported.
- Reference can show a single earring or both earrings.
- If both earrings are in the reference, engine uses auto-detection/default settings.

Common errors:

- `RUNTIME_ERROR`
- `PHOTO_DETECTION_FAIL`
- `OBJECT_DETECTION_FAIL`
- `PHOTO_CHECK_INVALID`
- `INPUT_ERROR`
- `INPUT_MAIN_IMAGE_EMPTY`

Mirra UI:

- Face-shape-matched earring recommendations.
- Side-facing capture tip when earring try-on fails.

### Necklace

Endpoints:

- `POST /s2s/v2.0/file/2d-vto/necklace`
- `POST /s2s/v2.0/task/2d-vto/necklace`
- `GET /s2s/v2.0/task/2d-vto/necklace/{task_id}`

Inputs:

- User image: `src_file_id` or `src_file_url`
- Necklace image: `ref_file_ids` or `ref_file_urls`
- Optional source mask: `srcmsk_file_id` or `srcmsk_file_url`
- Optional parameters:
  - `necklace_wearing_location`: two target points
  - `necklace_shadow_intensity`: 0.0 to 1.0, default 0.15
  - `necklace_ambient_light_intensity`: 0.0 to 1.0, default 1.0
  - `necklace_anchor_point`: two pixel coordinate anchor points

Requirements:

- long side <= 4096.
- file < 10 MB.
- jpg/jpeg/png.
- Front-facing selfie.
- Neck clearly visible and unobstructed.
- Horizontal head rotation within 20 degrees.
- Neck width should occupy at least 15% of image width.
- Reference necklace should be front-facing, worn, with background removed.

Common errors:

- `RUNTIME_ERROR`
- `PHOTO_DETECTION_FAIL`
- `OBJECT_DETECTION_FAIL`
- `PHOTO_CHECK_INVALID`
- `INPUT_ERROR`
- `INPUT_MAIN_IMAGE_EMPTY`

Mirra UI:

- Neckline-aware necklace suggestions.
- Capture guidance when the neck is blocked or cropped.

### Ring, Bracelet, Watch

These are useful later but require dedicated hand/wrist capture modes.

| API | Endpoint family | User image | Reference image |
|---|---|---|---|
| Ring | `/2d-vto/ring` | Back of hand, five fingers visible | Ring at approx 45-degree front view |
| Bracelet | `/2d-vto/bracelet` | Back of wrist, five fingers visible | Bracelet at approx 45-degree front view |
| Watch | `/2d-vto/watch` | Back of wrist, five fingers visible | Clear front watch view, realistic strap crop |

Common parameters:

- Wearing location.
- Shadow intensity.
- Ambient light intensity.
- Optional anchor points.
- Optional masks.

Common errors:

- `RUNTIME_ERROR`
- `PHOTO_DETECTION_FAIL`
- `OBJECT_DETECTION_FAIL`
- `PHOTO_CHECK_INVALID`
- `INPUT_ERROR`
- `INPUT_MAIN_IMAGE_EMPTY`

Use:

- Future dedicated accessory studio.
- Do not include in the core selfie-only demo flow.

## Other Visual APIs

### Nail VTO

Use:

- Future hand capture feature.
- Needs a dedicated hand image flow, not the current selfie flow.

### Eye Color Lens

Use:

- Future eye/lens try-on.
- Requires selfie plus lens asset.

### Teeth Whitening

Use:

- Future photo polish or smile enhancement.
- Requires visible teeth/smile image validation.

### Aging Simulation

Endpoints:

- `POST /s2s/v2.0/file/aging`
- `POST /s2s/v2.0/task/aging`
- `GET /s2s/v2.0/task/aging/{task_id}`

Use:

- Future novelty/education flow.
- Not core to Mirra's current shopping and proof-card value.

### Face Reshape And Body Reshape

Endpoints:

- Face reshape: `/face-reshape`
- Body reshape: `/body-reshape`
- Both have optional `pre-process` task endpoints for multi-target detection.

Use:

- Avoid in the hackathon core flow. These can create body-image or medical-aesthetic sensitivity.
- If ever enabled, label outputs as visualization only and provide strong user controls.

## Product Image Resolver

Problem:

- Serper often returns product page URLs, thumbnails, redirects, temporary CDN URLs, protected images, or URLs that are not directly fetchable by Perfect Corp.
- Perfect Corp needs stable, direct, public image URLs for reference images.

Backend resolver contract:

```json
{
  "input_url": "https://retailer.example/product/123",
  "input_type": "product_page_or_image",
  "resolved_image_url": "https://public-storage.example/resolved/product-123.jpg",
  "content_type": "image/jpeg",
  "width": 1024,
  "height": 768,
  "source": "og_image",
  "warnings": []
}
```

Resolver behavior:

1. Accept `product_url` or `image_url`.
2. Fetch with timeout and follow redirects.
3. If response is HTML, extract image candidates in this order:
   - OpenGraph `og:image`
   - Twitter image
   - JSON-LD product image
   - high-confidence product image elements
4. Fetch candidate image.
5. Validate:
   - content type is image/jpeg, image/png, image/webp, or supported HEIC where applicable
   - file size < 10 MB
   - dimensions within the target API's bounds
   - URL is not a data URL, blocked URL, or expiring thumbnail when avoidable
6. Normalize:
   - Convert unsupported formats to jpg/png.
   - Resize down to provider max side.
   - Preserve aspect ratio.
7. Store in stable public storage, preferably Supabase Storage.
8. Return a public direct URL that Perfect Corp can download.

User-facing failures:

- Product page URL: "We found the product page, but need a clean product image. Try another image or product."
- Expired/protected image URL: "That product image expired. Pick another image or retry search."
- Unsupported category: "This item type is not supported for this try-on mode."
- Reference image invalid: "The product image does not clearly show one front-facing item."

## Error Taxonomy

Every backend Perfect Corp error should map into a stable Mirra error category.

| Mirra category | Provider examples | User message |
|---|---|---|
| `product_page_url` | HTML instead of image, bad Serper URL | "This is a product page, not a direct image. We are looking for a clean product image." |
| `expired_image_url` | `error_download_image`, 403/404 from CDN | "That image link expired or is blocked. Try another product image." |
| `face_rejected` | no face, face too small, face out of boundary, angle invalid | "Retake with your face centered, visible, and well lit." |
| `body_pose_rejected` | `error_pose`, `PHOTO_CHECK_INVALID`, no shoulder | "Use a front-facing standing photo with face and shoulders visible." |
| `reference_rejected` | `error_invalid_ref`, `OBJECT_DETECTION_FAIL` | "The product image is not clear enough for try-on." |
| `api_timeout` | polling timeout, task expired, `InvalidTaskId` | "The render took too long. Please retry." |
| `unsupported_category` | `invalid_parameter`, category mismatch | "This item is not supported in this try-on mode yet." |
| `provider_auth` | `InvalidAccessToken`, 401 | "Try-on service credentials are not configured." |
| `provider_units` | insufficient balance, credit issue | "Try-on units are unavailable. Check Perfect Corp unit balance." |
| `provider_internal` | `unknown_internal_error`, inference runtime errors | "The visual engine could not process this image. Try another photo." |
| `safety_blocked` | `error_nsfw_content_detected` | "This image could not be processed due to safety filters." |

## UI Surfaces

Skin page:

- Score summary and concern ranking.
- Individual concern cards with `ui_score`, previous score delta, and user-facing explanation.
- Optional mask overlay viewer.
- Skin tone swatch.
- Skin simulation before/after slider.
- Product recommendation cards driven by the selected concern.

GlowUp page:

- Face profile: face shape, undertone, hair/lip/eye color where available.
- Gemini plan card: makeup, hair, earrings, necklace.
- Step-by-step VTO application cards.
- Compare original/result.
- Save to look diary.

Try-On page:

- Split orchestration into flows:
  - preview state
  - clothes
  - makeup
  - hair
  - accessories
  - product search
- Show resolver status before Perfect Corp is called.
- Show task status while polling.
- Persist result to proof cards/look diary.

Outfit page:

- Weather and occasion context.
- Closet-owned items first.
- Gap product search.
- Clothes VTO result.
- Proof card: owned items, new items, total spend, reasoning, saved image.

## Gemini Contracts

Gemini responses must be strict JSON. The frontend should not parse prose.

Skin insight:

```json
{
  "primary_concern": "moisture",
  "why": "Moisture is your lowest score and humidity is low today.",
  "search_query": "hyaluronic acid serum for dehydrated skin",
  "steps": [
    { "label": "Skin scan", "status": "complete", "detail": "14 concerns scored" }
  ],
  "recommendations": [
    { "title": "Add humectant serum", "cta": "Find products", "priority": 1 }
  ]
}
```

GlowUp plan:

```json
{
  "makeup": {
    "goal": "soft warm definition",
    "effects_preset_id": "warm_soft_day",
    "reason": "Warm undertone supports peach and bronze shades."
  },
  "hair": {
    "template_or_reference": "face-framing waves",
    "reason": "Adds width and movement around the face."
  },
  "accessories": {
    "earrings": "drop",
    "necklace": "short pendant",
    "reason": "Balances face shape and neckline."
  }
}
```

Outfit reasoning:

```json
{
  "occasion": "board meeting",
  "weather_notes": "Cool morning, light layer recommended.",
  "owned_items": ["navy blazer", "white shirt"],
  "gaps": ["formal dress shoe"],
  "proof_card_summary": "Uses two closet items and one suggested purchase.",
  "cta": "Try the full look"
}
```

## Google Cloud Gemini Key

The Gemini key belongs on the backend only.

There are two possible integration paths:

- Gemini Developer API key: simple API key call to `generativelanguage.googleapis.com`.
- Vertex AI on Google Cloud: OAuth/service-account flow against Vertex endpoints.

If the key is from Google Cloud Console and is enabled for the Gemini Developer API, the current direct API-key client can work after environment naming cleanup. If the project uses Vertex AI, implement a separate Vertex client with service account or application default credentials.

Recommended env (this app uses **Vertex only** for Gemini):

- `GCP_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT`, optional `GEMINI_MODEL_NAME`, and Application Default Credentials (typically `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service account JSON with Vertex access).
- Avoid frontend exposure.

## Operational Checklist

Before a demo:

- Check Perfect Corp unit balance with `/s2s/v1.0/client/credit`.
- Run one test for each core API path with known-good sample images.
- Verify product resolver returns direct public image URLs.
- Verify result images are copied into durable storage.
- Verify user-facing error messages for:
  - product page URL
  - expired image URL
  - face rejected
  - API timeout
  - unsupported category
- Confirm Gemini returns schema-valid JSON for skin, glowup, and outfit plans.
