# Public Assets - Soravur

This folder contains all public assets for the Soravur web application.

## Folder Structure

```
public/
├── logo/
│   ├── soravur-logo.svg       # Full logo with text (200x60)
│   ├── soravur-logo-dark.svg  # Dark mode version
│   └── soravur-icon.svg       # Icon only (48x48)
├── icons/
│   ├── icon-192.svg           # PWA icon 192x192
│   ├── icon-512.svg           # PWA icon 512x512
│   └── apple-touch-icon.svg   # Apple touch icon 180x180
├── favicon.svg                # Browser favicon
└── manifest.json              # PWA manifest
```

## Logo Files

### soravur-logo.svg

- **Size**: 200x60px
- **Usage**: Main logo for landing pages, headers (light mode)
- **Contains**: Icon + "Soravur" text + subtitle

### soravur-logo-dark.svg

- **Size**: 200x60px
- **Usage**: Main logo for dark mode
- **Contains**: Icon + "Soravur" text + subtitle (light colors)

### soravur-icon.svg

- **Size**: 48x48px
- **Usage**: Compact icon for app headers, buttons
- **Contains**: Just the "S" icon

## Icon Files

### icon-192.svg

- **Size**: 192x192px
- **Usage**: PWA home screen icon (small)
- **Format**: SVG (scalable)

### icon-512.svg

- **Size**: 512x512px
- **Usage**: PWA home screen icon (large), splash screens
- **Format**: SVG (scalable)

### apple-touch-icon.svg

- **Size**: 180x180px
- **Usage**: iOS home screen icon
- **Format**: SVG

### favicon.svg

- **Size**: 32x32px
- **Usage**: Browser tab icon
- **Format**: SVG (modern browsers only)

## Design System

### Colors

- **Primary Gradient**: `#8b5cf6` → `#7c3aed` (Violet 500 → Purple 600)
- **Light Text**: `#1f2937` (Gray 800)
- **Light Subtitle**: `#6b7280` (Gray 500)
- **Dark Text**: `#f9fafb` (Gray 50)
- **Dark Subtitle**: `#9ca3af` (Gray 400)

### Brand Guidelines

1. **Logo Usage**:

   - Always maintain aspect ratio
   - Minimum size: 120px width for full logo
   - Clear space: 10px around logo
   - Don't modify colors or proportions

2. **Icon Usage**:

   - Can be used standalone
   - Always use gradient background
   - Don't change the "S" letter design

3. **Color Palette**:
   - Primary: Violet/Purple gradient
   - Always use the gradient, not solid colors
   - Maintain consistency across all assets

## Usage in Components

### Import Logo

```tsx
import Image from 'next/image';

// Full logo
<Image src="/logo/soravur-logo.svg" alt="Soravur" width={200} height={60} />

// Icon only
<Image src="/logo/soravur-icon.svg" alt="Soravur" width={48} height={48} />

// Or use directly in img tag
<img src="/favicon.svg" alt="Soravur" />
```

### Current Implementation

The app currently uses inline gradient divs for the icon. To use the SVG assets:

```tsx
// Replace the inline div with:
<img src="/logo/soravur-icon.svg" alt="Soravur" className="h-8 w-8" />
```

## PWA Manifest

The `manifest.json` file enables:

- Add to home screen functionality
- Standalone app mode
- Custom splash screen
- App shortcuts
- Proper theming

Link it in your layout:

```html
<link rel="manifest" href="/manifest.json" />
```

## Future Assets to Add

1. **Raster Icons** (PNG/WebP):

   - favicon.ico (16x16, 32x32, 48x48)
   - icon-192.png
   - icon-512.png
   - apple-touch-icon.png

2. **Marketing Assets**:

   - Social media preview images (OG images)
   - Screenshots for PWA
   - App store assets

3. **Illustrations**:
   - Empty states
   - Error states
   - Loading animations

## Generating Raster Icons

To convert SVG to PNG for better compatibility:

```bash
# Using ImageMagick or similar tools
convert -background none -density 300 favicon.svg -resize 32x32 favicon.png

# Or use online tools:
# - https://cloudconvert.com/svg-to-png
# - https://realfavicongenerator.net/
```

## License

These assets are part of the Soravur project and follow the same license.
