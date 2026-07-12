---
title: "Keycode Generator CLI"
status: Draft
type: task
story: "Sign Up with Email + Password + Invite Keycode"
---

## Description

A CLI script for generating one-time invite keycodes. This is how you control who can register for LIFEY — you generate a keycode, share it privately, and it's consumed on first use.

---

## Tasks

- [ ] Create a Node.js CLI script (`scripts/generate-keycode.js`)
- [ ] Generate unique random alphanumeric keycodes (format: `LIFEY-XXXXXXXX`)
- [ ] Store generated keycodes in a JSON file (or DB table) with status tracking
- [ ] Default behavior: generate 1 keycode and print it
- [ ] `--count N` flag to generate N keycodes at once
- [ ] `--list` flag to show all keycodes with status (used/unused)
- [ ] Validate keycode uniqueness (no duplicates)

---

## Definition of Done

- [ ] Script runs without errors
- [ ] Generated keycode can be used for registration
- [ ] Used keycode is rejected on subsequent attempts
- [ ] `--help` flag shows usage instructions

**Size:** S
