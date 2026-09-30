# The coordinators' lineage runs out (#91) · 30 Sep 2026

- **Numbers:** found in the seventh coordinator's first minute, 13:37 UTC; its first two calls (`create_trigger` for the heartbeat, `send_later` for a check-in) both failed.
- **Went well:**
  - **Found before anything was retired.** The sixth coordinator, its heartbeat and its one-shot wakes for #72, #88 and #89 were left in place, so the parts still get woken.
- **Lessons:**
  - **Handing over from session to session hits a depth limit.** Each coordinator started the next, so the seventh sat at depth 8, where `create_trigger`, `send_later` and `create_session` refuse. The sixth's parts were at depth 8 too, so #86's "a part books its own wake" couldn't work for them. → The `coordinator` playbook (§1): the owner starts each coordinator from claude.ai; the outgoing one stays until the new one can book its heartbeat.
