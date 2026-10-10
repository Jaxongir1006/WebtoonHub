# Profile background artwork

Backgrounds are purchased cosmetics, equipped one at a time. The reader applies
the equipped artwork across the entire profile surface with a contrast overlay
so the profile and its content remain readable.

Staff upload through Shop → Background, either when creating an item or replacing
its artwork. Both the direct `asset_file` create flow and the standalone
`POST /api/v1/staff/shop/items/upload-asset` flow use the same validated processor.
Standalone uploads use multipart `file` and `item_type=background`; update an
existing item with the returned `asset_url` through PATCH.

PNG, JPEG and static WebP retain existing raster behavior; SVG is sanitized and
background-only SMIL animation elements are removed so SVG artwork stays static
and cannot bypass animation pause or reduced-motion controls. Avatar-frame SVG
processing remains unchanged. Every encoded background (including static
raster/SVG output) must also fit the 20 MiB upload limit.
GIF and animated WebP retain distinct frames, frame timing, transparency and
finite/infinite repeat behavior, re-encoded as animated WebP. GIF finite repeat
counts are converted to WebP total-play counts. Previously uploaded animations
were flattened and need re-uploading: discarded frames cannot be recovered.

Animated backgrounds have these limits to protect the free backend's resources:

| Limit | Maximum |
| --- | --- |
| Uploaded and encoded artwork size | 20 MiB |
| Frames | 120 |
| Decoded pixels per frame | 4 million |
| Total decoded pixels across frames | 40 million |
| One animation cycle | 30 seconds |
| Encoded longest dimension | 1920 px; aspect ratio preserved |

The decoded pixel limits are checked before each frame is loaded. GIF frame
iteration stops at the frame bound instead of scanning its whole stream. The
total pixel limit also bounds retained RGBA frame memory; background processing
is serialized in-process. Static raster compatibility remains unchanged at the
existing 40-million-pixel limit and static dimensions are not resized.

The processor saves a static first-frame WebP poster for every animated upload.
No database migration is needed: shop items reuse their existing `asset_animated`
and `asset_preview_url` columns. These fields are derived server-side and appear
in upload/create/edit responses, catalog/inventory items, and equipped background
data in own/public profiles and friend summaries. The reader uses the poster for
reduced motion or an explicit animation pause. Backgrounds do not use collectible
card metadata or card upload limits.

New background URLs are validated local references under
`/content/backgrounds/asset_<uuid>.webp` (or sanitized SVG). On create/edit via
URL, the backend inspects these saved files and verifies their poster rather
than accepting flags from the client. Legacy/static external cosmetic URLs remain
compatible and are treated as static. Replacing or deleting an item cleans up
unreferenced artwork and posters through the existing media-reference checks.

Invalid files and animation limits return HTTP 422, file/output size limits
return HTTP 413, and failed storage writes return HTTP 503 with attempted upload
cleanup. Successful asset responses have the same shape as:

```json
{
  "asset_url": "/content/backgrounds/asset_<uuid>.webp",
  "asset_preview_url": "/content/backgrounds/asset_<uuid>_preview.webp",
  "asset_animated": true
}
```
