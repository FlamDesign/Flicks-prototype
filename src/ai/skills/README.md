# Flick skills

Playbooks the in-app chat (Claude) follows while it makes a Flick. Each file is one skill: front
matter (`name`, `description`, `when`) and the playbook. The skills for the current step are in the
chat's instructions in full (flicks, voice and interruptions always; intent, research, concepts and
formats before the storyboard; storyboard, references, formats and build while it's drafted; build,
changes, references and formats after the build). The rest are read with `read_skill` when needed.

Edit these to change how the chat works: no code changes needed. One rule in one place; keep each
skill short, concrete and testable. The goal of every rule: the best possible Flick, one that people
want to tap through and that sells.
