---
name: Package installation compatibility
description: Dependency versions that keep this bot installable when the package firewall rejects vulnerable transitive archives.
---

Use current releases of scraper dependencies when installing this bot. The older scraper release pulled a blocked `tar` archive through its dependency tree, while the current release installs cleanly.

**Why:** The Replit package firewall rejects vulnerable transitive packages instead of allowing an unsafe install.

**How to apply:** If dependency installation fails on `tar` or a similar transitive archive, update the direct parent dependency before trying workarounds or bypasses.