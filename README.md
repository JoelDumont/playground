# Git Rebase Visualizer

This p5.js sketch visualizes what happens during a `git rebase main` flow.

## What It Shows

- `main` has a base commit and two newer commits.
- `feature` starts from an older `main` commit and has three commits of its own.
- During rebase, each feature commit is replayed one-by-one onto the tip of `main`.
- Old feature commits are faded to indicate history rewriting.

## Controls

- `R` to restart the animation.

## Why This Matters

The visualization highlights that rebasing changes commit ancestry by creating new commit objects with new hashes, while preserving the patch intent of each replayed commit.

Space for new ideas