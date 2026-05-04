# Perfect Corp API Reference (for Agent Context)

## Auth & Base URLs
- **REST API Server:** `https://yce-api-01.perfectcorp.com` (alias: `https://yce-api-01.makeupar.com`)
- **MCP Server:** `https://mcp-api-01.makeupar.com/mcp`
- **Auth:** Bearer token in header: `Authorization: Bearer YOUR_API_KEY`
- **API Key Console:** https://yce.makeupar.com/api-console/en/api-keys/

## Universal Workflow (ALL APIs follow this)
```
1. POST /s2s/v2.0/file/{task-type}     → get upload URL + file_id
2. PUT  {upload_url}                    → upload image binary
3. POST /s2s/v2.0/task/{task-type}      → start task, get task_id
4. GET  /s2s/v2.0/task/{task-type}/{id} → poll until success/error
5. Response contains result image URL (24hr retention)
```

Alternative: supply `src_image_url` (public URL) instead of file_id upload.

## Image Requirements
- Format: jpg/jpeg/png
- Size: < 10MB
- Dimensions: long side ≤ 4096px
- Face photos: face must occupy >60% of image width

## Rate Limits
- Hackathon budget: 1000 units total
- 1 unit = 1 successful API task

## Key APIs We Use

### Skin & Face (Analysis — return JSON scores)
| API | Endpoint | Returns |
|---|---|---|
| Skin Analysis | `/task/skin-analysis` | 14 skin scores (wrinkle, pore, moisture, acne, etc.) + skin_age |
| Skin Tone Analysis | via MCP `AI-Skin-Tone-Analysis` | Facial skin tone + eye/brow/lip/hair colors |
| Face Analyzer | via MCP `AI-Face-Analyzer` | Face geometry (eye shape, nose, cheekbones) |
| Aging Generator | via MCP `AI-Aging-Generator` | Age-progressed images |

### Beauty (VTO — return composited images)
| API | Endpoint | Input | Returns |
|---|---|---|---|
| Makeup VTO | via MCP `AI-Makeup-Virtual-TryOn` | selfie + pattern JSON (lip, eye, blush, foundation etc.) | Composited image |
| Look VTO | via MCP `AI-Look-Vto` | selfie + template_id (from AI-Look-Virtual-TryOn-Templates) | Full look composited |
| Makeup Transfer | via MCP `AI-Makeup-Transfer` | selfie + reference face | Makeup copied to user |

### Fashion (VTO — return composited images)
| API | Input | Returns |
|---|---|---|
| AI-Cloth | selfie + garment image (flat-lay/product photo) | User wearing garment |
| AI-Bag | user photo + bag image | Bag placed on user |
| AI-Scarf | selfie + scarf image | Scarf on user |
| AI-Shoes | user photo + shoe image | Shoes on user |
| AI-Hat | selfie + hat image | Hat on user |

### Jewelry & Accessories (VTO)
| API | Input | Returns |
|---|---|---|
| AI-Earring-Virtual-Try-On | selfie + earring image | Earrings on user |
| AI-Necklace-Virtual-Try-On | selfie + necklace image | Necklace on user |
| AI-Ring-Virtual-Try-On | hand photo + ring image | Ring on user |
| AI-Watch-Virtual-Try-On | wrist photo + watch image | Watch on user |
| AI-Bracelet-Virtual-Try-On | wrist photo + bracelet image | Bracelet on user |

### Hair (VTO)
| API | Input | Returns |
|---|---|---|
| AI-Hairstyle-Generator | selfie + template_id or description | New hairstyle |
| AI-Hair-Color | selfie + color params | Hair recolored |
| AI-Wavy-Hair | selfie + template_id | Wavy/curly effect |
| AI-Hair-Bang-Generator | selfie + template_id | Bangs applied |

### Image Enhancement
| API | Use |
|---|---|
| AI-Photo-Enhance | Clean up selfie quality |
| AI-Photo-Lighting | Normalize lighting conditions |
| AI-Photo-Background-Removal | Clean product images |

## Makeup Pattern JSON Structure (for Makeup VTO)
Each effect has its own structure. Example lipstick:
```json
{
  "category": "lip_color",
  "shape": { "name": "original" },
  "palettes": [{
    "color": "#ff0000",
    "texture": "matte",
    "colorIntensity": 50
  }],
  "style": { "type": "full" }
}
```
Available effects: SkinSmoothEffect, BlushEffect, BronzerEffect, ConcealerEffect, ContourEffect, EyebrowsEffect, EyelinerEffect, EyeshadowEffect, EyelashesEffect, FoundationEffect, HighlighterEffect, LipColorEffect, LipLinerEffect.

Lip shape patterns: https://plugins-media.makeupar.com/wcm-saas/shapes/lipshape.json

## MCP vs REST Decision
- **Use MCP** when: calling from LLM agent context (function calling)
- **Use REST** when: direct backend calls with precise control
- For hackathon: REST from our backend (more control over mocking)

## Skin Analysis Response Structure
```json
{
  "all": { "score": 75.76 },
  "skin_age": 37,
  "moisture": { "raw_score": 48.69, "ui_score": 70 },
  "acne": { "raw_score": 92.30, "ui_score": 88 },
  "wrinkle": { "raw_score": 36.09, "ui_score": 60 },
  "pore": { "raw_score": 88.38, "ui_score": 84 },
  "texture": { "raw_score": 80.10, "ui_score": 76 },
  "redness": { "raw_score": 72.01, "ui_score": 77 },
  "oiliness": { "raw_score": 60.74, "ui_score": 72 },
  "firmness": { "raw_score": 89.67, "ui_score": 85 },
  "radiance": { "raw_score": 76.57, "ui_score": 79 },
  "dark_circle_v2": { "raw_score": 80.20, "ui_score": 76 },
  "eye_bag": { "raw_score": 76.67, "ui_score": 79 },
  "age_spot": { "raw_score": 83.23, "ui_score": 77 }
}
```
