# CON-COST brand color extraction

## Evidence

- Classification: `SOURCE_VERIFIED`
- Source asset: `public/brand/con-cost-logo.png`
- Source dimensions: 482 × 112 px
- SHA-256: `B0EEF710A8BEF5E6272DDE976B1C5AFF0E41D4FE7F8276DD4AEA9BA8EB787C6D`
- Extraction tool: Pillow 13.0.0 RGBA histogram, ignoring pixels with alpha ≤ 32 and near-white pixels
- Dominant non-white pixel: RGB (235, 99, 0), 12,993 pixels

## Approved palette

The dominant source color is `#EB6300`; it is the final brand-orange token (`--cc-orange-500`), not an interim value. The scale in `src/app/globals.css` is derived around this source value while preserving semantic roles.

| Role | Token | Value | Usage |
|---|---|---:|---|
| Brand source | `--cc-orange-500` | `#EB6300` | selection, indicator, focus, icon accent |
| Hover | `--cc-orange-600` | `#CF4D00` | hover border and accent |
| Strong action | `--cc-orange-700` | `#A83F00` | filled controls with white text |
| Soft surface | `--cc-orange-50` | `#FFF6ED` | selected/hover tint |

## Contrast decisions

- `#EB6300` against near-black `#0B1220`: 5.63:1 (AA for normal text).
- `#EB6300` against white: 3.32:1, so source orange is not used as a small-text background with white text.
- `#A83F00` against white: 6.22:1 (AA for normal text), so the strong token is used for filled buttons and selected tabs.
- Focus uses a wide translucent orange outline plus an offset; active navigation also uses position and shape, not color alone.

## Logo usage

- Preserve the original aspect ratio.
- Render on a white container when placed on the near-black navigation surface.
- Do not recolor, stretch, crop, or replace the approved asset with text.
