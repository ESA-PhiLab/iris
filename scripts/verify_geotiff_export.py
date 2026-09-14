#!/usr/bin/env python3
"""
Verify GeoTIFF Export

This script opens an exported GeoTIFF file and displays:
1. Original image bands (RGB composite if multi-band)
2. Segmentation mask with class colors
3. Overlay of mask on image
4. Metadata and statistics

Usage:
    python scripts/verify_geotiff_export.py <path_to_exported_geotiff> [config_file]
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import rasterio as rio
from matplotlib.patches import Patch


def load_config(config_path):
    """Load IRIS project configuration to get class colors"""
    if not config_path or not Path(config_path).exists():
        return None

    with open(config_path) as f:
        if config_path.endswith('.json'):
            return json.load(f)
        elif config_path.endswith('.yaml'):
            import yaml
            return yaml.safe_load(f)
    return None


def get_class_colors(config):
    """Extract class colors from config"""
    if not config or 'classes' not in config:
        # Default colors if no config
        return {
            0: [0, 0, 0, 0],      # Background - transparent
            1: [255, 0, 0, 128],   # Class 1 - red
            2: [0, 255, 0, 128],   # Class 2 - green
            3: [0, 0, 255, 128],   # Class 3 - blue
        }

    colors = {}
    for i, cls in enumerate(config['classes']):
        # Use user_colour if available, otherwise colour
        color = cls.get('user_colour', cls.get('colour', [255, 255, 255, 128]))
        colors[i] = color

    return colors


def normalize_band(band, percentile=2):
    """Normalize band to 0-1 range with percentile clipping"""
    vmin = np.percentile(band, percentile)
    vmax = np.percentile(band, 100 - percentile)
    normalized = np.clip((band - vmin) / (vmax - vmin), 0, 1)
    return normalized


def create_rgb_composite(data, band_indices=None):
    """Create RGB composite from multi-band data"""
    if band_indices is None:
        band_indices = [0, 1, 2]
    if data.shape[0] < 3:
        # Grayscale - use first band for all channels
        band = normalize_band(data[0])
        return np.stack([band, band, band], axis=-1)

    # Use specified bands for RGB
    rgb = np.stack([
        normalize_band(data[band_indices[0]]),
        normalize_band(data[band_indices[1]]),
        normalize_band(data[band_indices[2]])
    ], axis=-1)

    return rgb


def create_mask_visualization(mask, class_colors):
    """Create colored mask visualization"""
    height, width = mask.shape
    colored_mask = np.zeros((height, width, 4), dtype=np.uint8)

    for class_id, color in class_colors.items():
        mask_pixels = mask == class_id
        colored_mask[mask_pixels] = color

    return colored_mask


def verify_geotiff(geotiff_path, config_path=None):
    """Verify and visualize exported GeoTIFF"""

    print(f"📂 Opening: {geotiff_path}")

    # Load config if provided
    config = load_config(config_path) if config_path else None
    class_colors = get_class_colors(config)
    class_names = {}

    if config and 'classes' in config:
        class_names = {i: cls['name'] for i, cls in enumerate(config['classes'])}

    # Open GeoTIFF
    with rio.open(geotiff_path) as src:
        print("\n📊 GeoTIFF Information:")
        print(f"   Dimensions: {src.width} x {src.height}")
        print(f"   Bands: {src.count}")
        print(f"   Data types: {src.dtypes}")
        print(f"   CRS: {src.crs}")
        print(f"   Bounds: {src.bounds}")

        # Read all bands
        data = src.read()

        # Last band is the mask
        mask_band_idx = src.count - 1
        mask = data[mask_band_idx]
        original_bands = data[:mask_band_idx]

        print("\n🎨 Mask Statistics:")
        unique_classes = np.unique(mask)
        print(f"   Unique classes: {unique_classes}")
        for class_id in unique_classes:
            count = np.sum(mask == class_id)
            percentage = (count / mask.size) * 100
            class_name = class_names.get(class_id, f"Class {class_id}")
            print(f"   {class_name}: {count} pixels ({percentage:.2f}%)")

        # Get band descriptions
        band_descriptions = [src.descriptions[i] or f"Band {i+1}"
                           for i in range(src.count)]
        print("\n📝 Band Descriptions:")
        for i, desc in enumerate(band_descriptions):
            print(f"   Band {i+1}: {desc}")

    # Create visualizations
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle(f'GeoTIFF Export Verification: {Path(geotiff_path).name}',
                 fontsize=16, fontweight='bold')

    # 1. Original image (RGB composite)
    ax = axes[0, 0]
    if original_bands.shape[0] >= 3:
        rgb = create_rgb_composite(original_bands)
        ax.imshow(rgb)
        ax.set_title('Original Image (RGB Composite)', fontsize=12, fontweight='bold')
    else:
        ax.imshow(original_bands[0], cmap='gray')
        ax.set_title('Original Image (Grayscale)', fontsize=12, fontweight='bold')
    ax.axis('off')

    # 2. Segmentation mask with colors
    ax = axes[0, 1]
    colored_mask = create_mask_visualization(mask, class_colors)
    ax.imshow(colored_mask)
    ax.set_title('Segmentation Mask', fontsize=12, fontweight='bold')
    ax.axis('off')

    # Add legend
    legend_elements = []
    for class_id in unique_classes:
        if class_id in class_colors:
            color = np.array(class_colors[class_id]) / 255.0
            class_name = class_names.get(class_id, f"Class {class_id}")
            legend_elements.append(Patch(facecolor=color, label=class_name))

    if legend_elements:
        ax.legend(handles=legend_elements, loc='upper right',
                 framealpha=0.9, fontsize=10)

    # 3. Overlay (image + mask)
    ax = axes[1, 0]
    if original_bands.shape[0] >= 3:
        rgb = create_rgb_composite(original_bands)
    else:
        band = normalize_band(original_bands[0])
        rgb = np.stack([band, band, band], axis=-1)

    # Blend image and mask
    mask_rgba = colored_mask.astype(float) / 255.0
    alpha = mask_rgba[:, :, 3:4]
    blended = rgb * (1 - alpha) + mask_rgba[:, :, :3] * alpha

    ax.imshow(blended)
    ax.set_title('Overlay (Image + Mask)', fontsize=12, fontweight='bold')
    ax.axis('off')

    # 4. Mask distribution histogram
    ax = axes[1, 1]
    class_counts = [np.sum(mask == c) for c in unique_classes]
    colors_for_bars = [np.array(class_colors.get(c, [128, 128, 128, 255]))[:3] / 255.0
                       for c in unique_classes]
    labels = [class_names.get(c, f"Class {c}") for c in unique_classes]

    bars = ax.bar(range(len(unique_classes)), class_counts, color=colors_for_bars)
    ax.set_xticks(range(len(unique_classes)))
    ax.set_xticklabels(labels, rotation=45, ha='right')
    ax.set_ylabel('Pixel Count', fontsize=10)
    ax.set_title('Class Distribution', fontsize=12, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)

    # Add value labels on bars
    for i, (bar, count) in enumerate(zip(bars, class_counts)):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{count}\n({count/mask.size*100:.1f}%)',
                ha='center', va='bottom', fontsize=8)

    plt.tight_layout()

    # Save figure
    output_path = Path(geotiff_path).with_suffix('.verification.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"\n💾 Verification image saved: {output_path}")

    # Show plot
    plt.show()

    print("\n✅ Verification complete!")


def main():
    if len(sys.argv) < 2:
        print("Usage: python verify_geotiff_export.py <geotiff_path> [config_path]")
        print("\nExample:")
        print("  python scripts/verify_geotiff_export.py mountains_annotated.tif")
        print("  python scripts/verify_geotiff_export.py mountains_annotated.tif demo/cloud-segmentation.json")
        sys.exit(1)

    geotiff_path = sys.argv[1]
    config_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not Path(geotiff_path).exists():
        print(f"❌ Error: File not found: {geotiff_path}")
        sys.exit(1)

    verify_geotiff(geotiff_path, config_path)


if __name__ == '__main__':
    main()
