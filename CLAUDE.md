# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository is a fresh scaffold for **KoreoKorp V2** (see `README.md`). As of the initial commit it contains no source code, no package manifest, no build or test tooling, and no CI configuration. There is nothing to build, lint, or test yet.

Do not assume a language, framework, or package manager. Check the repository root for a manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.) before running any tooling commands.

## Working with the project owner

The owner is new to programming. When adding or changing code:

- Explain what the code does at a high level so they can build a mental model of it.
- Confirm the intended stack and goals before scaffolding a new project; a wrong early choice is costly here.

## Keeping this file current

Once a stack is chosen and the first real code lands, replace the "Current state" section with:

1. The exact commands to install dependencies, run the app, lint, run the full test suite, and run a single test.
2. A short description of the top-level architecture (how the main pieces fit together), not a file-by-file listing.
