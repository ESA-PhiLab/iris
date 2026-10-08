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


def main():
    """Entry point for the IRIS CLI."""
    app()


if __name__ == "__main__":
    main()
