---
name: WhatsApp image compatibility
description: Client differences between externalAdReply thumbnails and actual image messages.
---

For this bot, users reported that `externalAdReply` thumbnails were visible in WhatsApp Business but not in standard WhatsApp. Use actual image attachments when an icon must appear consistently across client types.

**Why:** A preview thumbnail is optional presentation metadata and may be hidden by some WhatsApp clients.

**How to apply:** For short command replies, attach the image with the caption. For long text menus, send a small image message separately and keep the original text menu intact.