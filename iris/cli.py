"""
IRIS CLI using Typer for modern command-line interface.

This module provides the command-line interface for IRIS using Typer,
which offers better type hints, automatic help generation, and cleaner code.
"""
from pathlib import Path
from typing import Optional

import typer
from typing_extensions import Annotated

app = typer.Typer(
    name="iris",
    help="IRIS - Intelligently Reinforced Image Segmentation",
    add_completion=False,
)


@app.command()
def demo(
    debug: Annotated[bool, typer.Option("--debug", "-d", help="Start in debug mode")] = False,
    production: Annotated[bool, typer.Option("--production", "-p", help="Use production WSGI server")] = False,
    admin_user: Annotated[
        Optional[str], typer.Option(help="Create admin user non-interactively (for CI/testing)")
    ] = None,
    admin_password: Annotated[Optional[str], typer.Option(help="Admin password for non-interactive creation")] = None,
):
    """
    Start IRIS in demo mode with the default cloud segmentation example.

    This mode automatically loads the demo project configuration and starts the server.
    Perfect for trying out IRIS or running tests.

    Examples:
        iris demo
        iris demo --admin-user admin --admin-password 123
        iris demo --production
    """
    from iris import get_demo_file, start_server

    project_file = get_demo_file()
    start_server(
        project_file=project_file,
        debug=debug,
        production=production,
        admin_user=admin_user,
        admin_password=admin_password,
    )


@app.command()
def label(
    project: Annotated[str, typer.Argument(help="Path to project configuration file (JSON or YAML)")],
    debug: Annotated[bool, typer.Option("--debug", "-d", help="Start in debug mode")] = False,
    production: Annotated[bool, typer.Option("--production", "-p", help="Use production WSGI server")] = False,
    admin_user: Annotated[
        Optional[str], typer.Option(help="Create admin user non-interactively (for CI/testing)")
    ] = None,
    admin_password: Annotated[Optional[str], typer.Option(help="Admin password for non-interactive creation")] = None,
):
    """
    Start IRIS with a custom project configuration file.

    Load your own project configuration (JSON or YAML format) and start the annotation server.

    Examples:
        iris label my-project.json
        iris label config.yaml --production
        iris label project.json --admin-user admin --admin-password secret
    """
    from iris import start_server

    project_path = Path(project)
    if not project_path.exists():
        typer.echo(f"Error: Project file '{project}' not found!", err=True)
        raise typer.Exit(code=1)

    start_server(
        project_file=str(project_path),
        debug=debug,
        production=production,
        admin_user=admin_user,
        admin_password=admin_password,
    )


@app.command()
def launch(
    folder: Annotated[str, typer.Argument(help="Project folder name to create or launch")],
):
    """
    Create a new project from the demo template or launch an existing one.

    If the folder doesn't exist, creates it by copying the demo project.
    If it exists, launches it with the existing configuration.

    Examples:
        iris launch my-project
        iris launch cloud-analysis
    """
    from iris import handle_launch_command, start_server

    try:
        config_file = handle_launch_command(folder)
        typer.echo(f"Launching project '{folder}' with config '{config_file}'...")
        start_server(project_file=str(config_file), debug=False, production=False)
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(code=1) from e


@app.command()
def rm(
    folder: Annotated[str, typer.Argument(help="Project folder name to remove")],
    force: Annotated[bool, typer.Option("--force", "-f", help="Skip confirmation prompt")] = False,
):
    """
    Remove a project folder and all its contents.

    Deletes the specified project folder including all annotations and data.
    Asks for confirmation unless --force is used.

    Examples:
        iris rm old-project
        iris rm test-project --force
    """
    from iris import handle_rm_command

    try:
        handle_rm_command(folder, force=force)
    except (ValueError, FileNotFoundError) as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(code=1) from e


@app.command(name="export-all")
def export_all(
    project_file: Annotated[str, typer.Argument(help="Path to project configuration file (JSON or YAML), or 'demo'")],
    output_dir: Annotated[
        Optional[str], typer.Option("--output", "-o", help="Output directory for exported files")
    ] = "exports",
):
    """
    Export all annotated images as GeoTIFF files with merged masks.

    This command exports all images that have annotations, creating GeoTIFF files
    with RGB bands and merged segmentation masks. Files are named using the pattern:
    {project_name}_{image_id}_merged.tif

    The output directory defaults to 'exports' in the current working directory,
    but can be customized with the --output option. Both relative and absolute
    paths are supported.

    You can use 'demo' as the project file to export from the demo project.

    Examples:
        iris export-all demo
        iris export-all my-project.json
        iris export-all config.yaml --output /path/to/exports
        iris export-all project.json -o ./my-exports
    """
    import os
    import sys
    from glob import glob

    import numpy as np
    import rasterio as rio

    # Handle 'demo' keyword
    if project_file.lower() == 'demo':
        from iris import get_demo_file
        project_file = get_demo_file()
        typer.echo(f"📦 Using demo project: {project_file}")

    # Validate project file exists
    project_path = Path(project_file)
    if not project_path.exists():
        typer.echo(f"Error: Project file '{project_file}' not found!", err=True)
        raise typer.Exit(code=1)

    try:
        # Load project configuration
        from iris.project import project as proj
        proj.load_from(str(project_path))

        # Convert output_dir to absolute path
        if not os.path.isabs(output_dir):
            output_dir = os.path.join(os.getcwd(), output_dir)

        os.makedirs(output_dir, exist_ok=True)

        typer.echo(f"📁 Output directory: {output_dir}")
        typer.echo(f"📊 Project: {proj.config.get('name', 'Unknown')}")
        typer.echo(f"🖼️  Total images: {len(proj.image_ids)}")
        typer.echo("")

        # Get project name for filename prefix
        import re
        project_name = proj.config.get('name', 'project')
        project_name = re.sub(r'[^\w\-_]', '_', project_name)

        exported_count = 0
        skipped_count = 0

        from iris.segmentation import compute_merged_mask, get_mask_filenames

        # Progress bar setup
        total_images = len(proj.image_ids)

        # Iterate through all images
        for idx, image_id in enumerate(proj.image_ids, 1):
            # Update progress
            progress_pct = (idx / total_images) * 100
            bar_length = 40
            filled_length = int(bar_length * idx // total_images)
            bar = '█' * filled_length + '░' * (bar_length - filled_length)

            sys.stdout.write(f'\r🔄 Progress: [{bar}] {progress_pct:.1f}% ({idx}/{total_images})')
            sys.stdout.flush()

            try:
                # Check if image has any annotations
                final_mask_paths = get_mask_filenames(image_id, user_id="*")[0]
                mask_files = glob(final_mask_paths)

                if not mask_files:
                    skipped_count += 1
                    continue

                # Get the original image path
                image_path = proj.get_image_path(image_id)

                # Handle multi-source images
                if isinstance(image_path, dict):
                    if 'Sentinel2' in image_path:
                        image_path = image_path['Sentinel2']
                    elif 'Sentinel-2' in image_path:
                        image_path = image_path['Sentinel-2']
                    else:
                        image_path = list(image_path.values())[0]

                # Load and merge masks
                final_masks = []
                for path in mask_files:
                    mask_data = np.load(path)
                    final_masks.append(np.argmax(mask_data, axis=-1))

                final_masks = np.dstack(final_masks)
                merged_mask = compute_merged_mask(final_masks)

                # Render RGB image
                rgb_view = None
                if 'views' in proj.config:
                    if 'RGB' in proj.config['views']:
                        rgb_view = proj.config['views']['RGB']
                    elif 'NRGB' in proj.config['views']:
                        rgb_view = proj.config['views']['NRGB']

                if rgb_view:
                    rendered_rgb = proj.render_image(image_id, rgb_view)
                else:
                    with rio.open(image_path) as src:
                        original_data = src.read()
                        if original_data.shape[0] >= 3:
                            rendered_rgb = np.stack([
                                original_data[0],
                                original_data[1],
                                original_data[2]
                            ], axis=-1)
                        else:
                            rendered_rgb = np.stack([original_data[0]]*3, axis=-1)

                        rendered_rgb = ((rendered_rgb - rendered_rgb.min()) /
                                       (rendered_rgb.max() - rendered_rgb.min()) * 255).astype(np.uint8)

                # Get dimensions
                correct_height, correct_width = merged_mask.shape

                # Create GeoTIFF profile
                profile = {
                    'driver': 'GTiff',
                    'dtype': 'uint8',
                    'width': correct_width,
                    'height': correct_height,
                    'count': 4,
                    'crs': None,
                    'transform': rio.transform.from_bounds(0, 0, correct_width, correct_height,
                                                           correct_width, correct_height)
                }

                # Create output filename
                output_filename = f'{project_name}_{image_id}_merged.tif'
                output_path = os.path.join(output_dir, output_filename)

                # Write GeoTIFF
                with rio.open(output_path, 'w', **profile) as dst:
                    if rendered_rgb.shape[:2] != (correct_height, correct_width):
                        from skimage.transform import resize
                        rendered_rgb = resize(
                            rendered_rgb,
                            (correct_height, correct_width),
                            order=1,
                            preserve_range=True,
                            anti_aliasing=True
                        ).astype(np.uint8)

                    dst.write(rendered_rgb[:, :, 0], 1)
                    dst.write(rendered_rgb[:, :, 1], 2)
                    dst.write(rendered_rgb[:, :, 2], 3)
                    dst.write(merged_mask.astype(np.uint8), 4)

                    dst.set_band_description(1, 'Red')
                    dst.set_band_description(2, 'Green')
                    dst.set_band_description(3, 'Blue')
                    dst.set_band_description(4, 'Merged Segmentation Mask')

                exported_count += 1

            except Exception:
                skipped_count += 1
                # Continue processing other images

        # Clear progress bar line
        sys.stdout.write('\r' + ' ' * 80 + '\r')
        sys.stdout.flush()

        # Print summary
        typer.echo("")
        typer.echo("✅ Export complete!")
        typer.echo(f"   Exported: {exported_count} images")
        typer.echo(f"   Skipped: {skipped_count} images (no annotations)")
        typer.echo(f"   Output: {output_dir}")

    except Exception as e:
        typer.echo(f"\n❌ Error: {e}", err=True)
        raise typer.Exit(code=1) from e


def main():
    """Entry point for the IRIS CLI."""
    app()


if __name__ == "__main__":
    main()
