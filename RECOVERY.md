# Source recovery

Recovered on September 8, 2026 after the original uncommitted `visual-lab/` directory was deleted.

- Reapplied the successful source patches from the original workshop edit history in chronological order, including the later formatting, page navigation, monochrome styling, and batching changes.
- Restored all eight page entries, shared components, prepared lesson content, deterministic simulation rules, and the original 18 tests.
- Regenerated the original pinned Sites scaffold (`@openai/sites@0.3.0` with shadcn). The deleted dependency lockfile was unavailable, so dependencies were installed again and a new lockfile was saved.
- Downloaded the official club panda asset again from the URL recorded in the original README.
- Kept the older workshop and its `visual/index.html` prototype intact.

The recovered application lives at the root of this repository. The static export and Vercel configuration were added during migration; they were not part of the deleted version.

The source was recovered from edit records, not recreated from a screenshot or memory alone. Byte-for-byte identity with the deleted directory cannot be established because that directory and its original lockfile are unavailable. Raw session records and recovery scratch files are not included in this repository.
