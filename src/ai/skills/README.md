# Flick skills

Playbooks the in-app chat (Claude) reads while it makes a Flick. Each file is one skill:
front matter (`name`, `description`, `when`) and the playbook. The chat sees every skill's
description and reads the full text right before the step it covers (the `read_skill` tool).

Edit these to change how the chat works: no code changes needed. Keep each skill short,
concrete and testable. The goal of every rule: the best possible Flick, one that people want
to tap through and that sells.
