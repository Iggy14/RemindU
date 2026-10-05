@AGENTS.md

# Rules

- Read `docs/ARCHITECTURE.md` before adding or changing a feature — it documents how content is modelled and the extension points to use (e.g. how to add a product detail-page section). Follow the patterns there rather than inventing a parallel one.
- Use shadcn/ui components where possible instead of building custom UI from scratch.
- Use Tailwind CSS for styling — avoid inline styles or separate CSS files unless necessary.
- Keep components small and single-purpose. Split large components into smaller ones.
- After completing a task, run `npm run build` (and `npm run lint`) to confirm no errors before considering the task done.
- If a task involves logic that could break (forms, data fetching, utils), write or update a basic test if a test setup exists.
- Do not install new dependencies without checking if an existing one already covers the need.
- Never push to a remote. Committing locally is fine when asked; pushing is the user's to do.
- Ask before making structural changes (routing, folder layout, config files) that affect the whole project.
- When you introduce a pattern another session will need to follow — a new content type, data shape, or registry — add a short section for it to `docs/ARCHITECTURE.md` in the same task. Keep entries brief; do not document one-off components or anything already obvious from the code.
- When you deliberately leave something out of a task — a follow-up you flagged, work blocked on a decision or missing config, a shortcut taken knowingly — record it in `docs/TODO.md` before finishing. Write each entry so a session with no memory of this conversation can act on it: what is missing, why it was skipped, the concrete steps to do it, and the files involved. Delete the entry when the work ships. Do not log routine ideas or things already visible in the code — only work that was actually deferred.