# Bug Fix: Missing dst_actions Parameter

## Problem

Production logs showed HTTP 400 error:
```
Perfect Corp API Error [skin-analysis]: 400 - {
  "status": 400,
  "error": "Object has missing required properties ([\"dst_actions\"])",
  "error_code": "InvalidParameters"
}
```

## Root Cause

In `backend/app/services/perfectcorp.py`, line 119:

```python
# BEFORE (BUGGY CODE)
if task_type == "skin-analysis":
    dst_actions = params.pop("dst_actions", [])  # ❌ Removes from params
    if dst_actions:
        task_payload["dst_actions"] = dst_actions
# ... but we never added other params like 'format', 'face_angle_strictness_level'
```

**The bug had two issues:**

1. **Using `params.pop()`** - This removed `dst_actions` from the params dict
2. **Not including other params** - We only added `dst_actions` but ignored other params like:
   - `format` (required for JSON response)
   - `face_angle_strictness_level` (for better UX)

So the final payload was:
```json
{
  "src_file_id": "...",
  // ❌ Missing dst_actions
  // ❌ Missing format
  // ❌ Missing face_angle_strictness_level
}
```

## Solution

Changed to `params.get()` and added a loop to include all params:

```python
# AFTER (FIXED CODE)
if task_type == "skin-analysis":
    dst_actions = params.get("dst_actions", [])  # ✅ Doesn't remove from params
    if dst_actions:
        task_payload["dst_actions"] = dst_actions

# Add other params (format, face_angle_strictness_level, etc.)
for key, value in params.items():
    if key not in ["dst_actions", "features"]:  # Skip already handled params
        task_payload[key] = value
```

Now the payload correctly includes:
```json
{
  "src_file_id": "...",
  "dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle_v2", ...],
  "format": "json",
  "face_angle_strictness_level": "low"
}
```

## Verification

Created `backend/test_dst_actions_bug.py` to verify the fix:

```bash
cd backend
python3 test_dst_actions_bug.py
```

**Result:**
```
✅ TEST PASSED - dst_actions is properly included!
Task status: success
Found 'output' array with 8 items
```

## Impact

- ✅ HTTP 400 errors eliminated
- ✅ All skin analysis parameters properly sent to API
- ✅ Face angle tolerance works (better UX for onboarding)
- ✅ JSON format response received correctly

## Files Changed

- `backend/app/services/perfectcorp.py` - Fixed parameter handling
- `backend/test_dst_actions_bug.py` - Test to verify fix

## Commit

```
fix: Include all params (dst_actions, format, face_angle_strictness_level) in API payload

The bug was using params.pop() which removed dst_actions, but then we weren't
adding other params like 'format' and 'face_angle_strictness_level' to the payload.

Changed to params.get() and added a loop to include all other params except
the ones we handle specially (dst_actions, features).

This fixes the HTTP 400 error: 'Object has missing required properties (["dst_actions"])'
```

## Related Issues

This bug was discovered in production when testing the onboarding flow after merging the Perfect Corp API parameter updates (camelCase features, dark_circle_v2).

The parameter format changes were correct, but this separate bug in parameter handling was preventing the API calls from succeeding.
