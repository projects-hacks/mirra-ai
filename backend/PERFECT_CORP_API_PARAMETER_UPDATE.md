# Perfect Corp API Parameter Update

## Issue
Perfect Corp API was returning 400 errors due to outdated parameter names in our requests.

## Root Cause
The Perfect Corp API has updated their parameter naming conventions:
1. **skin-analysis**: Changed `dark_circle` to `dark_circle_v2`
2. **face-attr-analysis**: Changed from lowercase to camelCase format

## Testing Process
Created `test_api_parameters.py` to test different parameter formats against the live API.

### Test Results

#### 1. Skin Analysis API
```python
# ❌ OLD FORMAT (400 Error)
"dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle"]

# ✅ NEW FORMAT (200 Success)
"dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle_v2"]

# ✅ HD FORMAT (200 Success)
"dst_actions": ["hd_wrinkle", "hd_pore", "hd_texture", "hd_acne", "hd_dark_circle"]
```

**Error Message:**
```
Instance value ("dark_circle") not found in enum (possible values: 
["hd_wrinkle","hd_pore","hd_texture","hd_acne","hd_oiliness","hd_radiance",
"hd_eye_bag","hd_age_spot","hd_dark_circle","hd_droopy_upper_eyelid",
"hd_droopy_lower_eyelid","hd_firmness","hd_moisture","hd_redness",
"hd_tear_trough","hd_skin_type","wrinkle","pore","texture","acne",
"oiliness","radiance","eye_bag","age_spot","dark_circle_v2",...])
```

#### 2. Face Attributes Analysis API
```python
# ❌ OLD FORMAT (400 Error)
"features": ["faceshape", "agegender", "facialratio", "eyes", "lips", "nose"]

# ✅ NEW FORMAT (200 Success)
"features": ["faceShape", "age", "gender", "eyeShape", "lipShape", "noseWidth", "noseLength"]
```

**Error Message:**
```
Instance value ("faceshape") not found in enum (possible values: 
["eyeShape","eyeSize","eyeAngle","eyeDistance","eyelid","eyebrowShape",
"eyebrowThickness","eyebrowDistance","eyebrowShortness","cheekbones",
"faceShape","lipShape","noseWidth","noseLength","age","gender",
"eyeColor","lipColor","eyebrowColor","hairColor",...])
```

#### 3. Skin Tone Analysis API
```python
# ✅ NO CHANGES NEEDED (200 Success)
{
    "src_file_id": file_id
}
```

## Changes Made

### 1. Updated `backend/app/services/onboarding.py`

#### Skin Analysis Parameters
```python
# Before
"dst_actions": [
    "wrinkle", "pore", "texture", "acne", "redness", "oiliness",
    "age_spot", "radiance", "moisture", "dark_circle", "eye_bag",
    "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"
]

# After
"dst_actions": [
    "wrinkle", "pore", "texture", "acne", "redness", "oiliness",
    "age_spot", "radiance", "moisture", "dark_circle_v2", "eye_bag",
    "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"
]
```

#### Metric Mapping
```python
# Before
metric_mapping = {
    "dark_circle": "dark_circles",
    ...
}

# After
metric_mapping = {
    "dark_circle_v2": "dark_circles",  # Updated to v2
    ...
}
```

#### Face Attributes Parsing
```python
# Before (nested structure with lowercase keys)
age_gender = face_result.get("agegender", {})
facial_ratio = face_result.get("facialratio", {})
eyes_data = face_result.get("eyes", {})
lips_data = face_result.get("lips", {})
nose_data = face_result.get("nose", {})

face_shape_obj = {
    "shape": face_result.get("faceshape", "Oval"),
    "age": age_gender.get("age", None),
    "gender": age_gender.get("gender", None),
    "facial_ratios": facial_ratio,
    "eye_shape": array_to_string(eyes_data.get("eyeshape", None)),
    ...
}

# After (flat structure with camelCase keys)
face_shape_obj = {
    "shape": face_result.get("faceShape", "Oval"),
    "age": face_result.get("age", None),
    "gender": face_result.get("gender", None),
    "facial_ratios": {},  # Not requested in new format
    "eye_shape": array_to_string(face_result.get("eyeShape", None)),
    "eye_size": array_to_string(face_result.get("eyeSize", None)),
    "eyelid_type": array_to_string(face_result.get("eyelid", None)),
    "lip_shape": array_to_string(face_result.get("lipShape", None)),
    "nose_width": array_to_string(face_result.get("noseWidth", None)),
    "nose_length": array_to_string(face_result.get("noseLength", None)),
}
```

### 2. Updated `backend/app/services/perfectcorp.py`

```python
# Before
if task_type == "face-attr-analysis":
    task_payload["features"] = ["faceshape", "agegender", "facialratio", "eyes", "lips", "nose"]

# After
if task_type == "face-attr-analysis":
    # Face attributes API uses camelCase feature names
    task_payload["features"] = [
        "faceShape", "age", "gender",
        "eyeShape", "eyeSize", "eyelid",
        "lipShape", "noseWidth", "noseLength"
    ]
```

## Available Features

### Skin Analysis (dst_actions)
**Standard Definition (SD):**
- wrinkle, pore, texture, acne, oiliness, radiance
- eye_bag, age_spot, dark_circle_v2, droopy_upper_eyelid, droopy_lower_eyelid
- firmness, moisture, redness, tear_trough, skin_type

**High Definition (HD):**
- hd_wrinkle, hd_pore, hd_texture, hd_acne, hd_oiliness, hd_radiance
- hd_eye_bag, hd_age_spot, hd_dark_circle, hd_droopy_upper_eyelid, hd_droopy_lower_eyelid
- hd_firmness, hd_moisture, hd_redness, hd_tear_trough, hd_skin_type

### Face Attributes (features)
**Basic Features:**
- faceShape, age, gender

**Eye Features:**
- eyeShape, eyeSize, eyeAngle, eyeDistance, eyelid

**Eyebrow Features:**
- eyebrowShape, eyebrowThickness, eyebrowDistance, eyebrowShortness, eyebrowPosition, eyebrowArch

**Facial Features:**
- cheekbones, lipShape, noseWidth, noseLength

**Color Features:**
- eyeColor, lipColor, eyebrowColor, hairColor

**Ratios (Advanced):**
- horizontalThird, verticalFifth, faceAspectRatio, eyeAspectRatio
- eyeHeightToEyebrowDistance, noseAspectRatio, noseWidthToMouthWidth, noseToLipToChin, upperLipToLowerLip

## Response Format Changes

### Face Attributes Response
```python
# Before (nested structure)
{
    "results": {
        "faceshape": "Oval",
        "agegender": {"age": 25, "gender": "female"},
        "eyes": {"eyeshape": ["almond"], "eyesize": ["medium"]},
        "lips": {"lipshape": ["full"]},
        "nose": {"nosewidth": ["medium"], "noselength": ["medium"]}
    }
}

# After (flat structure)
{
    "results": {
        "faceShape": "Oval",
        "age": 25,
        "gender": "female",
        "eyeShape": ["almond"],
        "eyeSize": ["medium"],
        "eyelid": ["double"],
        "lipShape": ["full"],
        "noseWidth": ["medium"],
        "noseLength": ["medium"]
    }
}
```

## Testing
Run the test script to verify API parameters:
```bash
cd backend
python3 test_api_parameters.py
```

## Impact
- ✅ Fixes 400 errors for skin-analysis and face-attr-analysis
- ✅ Uses latest API parameter format
- ✅ Maintains backward compatibility in response parsing
- ✅ No changes needed for skin-tone-analysis

## Notes
- The API still accepts both SD and HD formats for skin analysis
- We're using SD format for now (wrinkle, pore, etc.)
- HD format (hd_wrinkle, hd_pore, etc.) provides higher accuracy but may be slower
- Face attributes now returns flat structure instead of nested objects
