"""
Tests for IRIS CLI using Typer.

These tests verify the Typer-based CLI works correctly.
"""
import re
import subprocess
import sys


def strip_ansi(text):
    """Remove ANSI color codes from text."""
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    return ansi_escape.sub('', text)


def test_help_prints_usage_and_exits_zero():
    """Test that --help shows usage and exits successfully."""
    proc = subprocess.run(
        [sys.executable, "-m", "iris.cli", "--help"],
        capture_output=True,
        text=True
    )

    out = strip_ansi((proc.stdout or "") + (proc.stderr or ""))
    assert proc.returncode == 0, f"Help exited with non-zero: {proc.returncode}\nOUT:\n{out}"
    assert "usage" in out.lower() or "Usage" in out, f"Help output did not contain 'usage':\n{out}"
    assert "demo" in out, "Help should list 'demo' command"
    assert "label" in out, "Help should list 'label' command"
    assert "launch" in out, "Help should list 'launch' command"
    assert "rm" in out, "Help should list 'rm' command"


def test_demo_help():
    """Test that demo --help works."""
    proc = subprocess.run(
        [sys.executable, "-m", "iris.cli", "demo", "--help"],
        capture_output=True,
        text=True
    )

    out = strip_ansi((proc.stdout or "") + (proc.stderr or ""))
    assert proc.returncode == 0, f"Demo help exited with non-zero: {proc.returncode}\nOUT:\n{out}"
    assert "--admin-user" in out, "Demo help should show --admin-user option"
    assert "--admin-password" in out, "Demo help should show --admin-password option"
    assert "--production" in out, "Demo help should show --production option"


def test_rm_help():
    """Test that rm --help shows force flag."""
    proc = subprocess.run(
        [sys.executable, "-m", "iris.cli", "rm", "--help"],
        capture_output=True,
        text=True
    )

    out = strip_ansi((proc.stdout or "") + (proc.stderr or ""))
    assert proc.returncode == 0, f"Rm help exited with non-zero: {proc.returncode}\nOUT:\n{out}"
    assert "--force" in out, "Rm help should show --force option"
