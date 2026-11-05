# End-to-end chat tests

Six chats run against the live site with **Sample videos** on (no videos are generated; images and
the AI chat are real). Each test answers whatever the chat shows, interrupts it on purpose, and
writes a log, screenshots and the saved chat to `tests/e2e/runs/<test>/`.

| Test | What it covers |
|---|---|
| t1 | Text only, the happy path to the hand-over |
| t2 | Product photo; size and length changed at the storyboard; Variation 1 approved in words |
| t3 | A website; typed brand; redirect mid-reply; Stop |
| t4 | Product Swap with the user's video; forced failures, the chat's retry, Try again |
| t5 | Make It Move; reload mid-reply (Continue) and while videos are made; remove a waiting variation |
| t6 | Clips to Flick; nothing to generate; the export check |

```sh
bash tests/e2e/make-files.sh          # once
export FP=<passcode>                  # never commit it
node tests/e2e/tests.cjs t1           # one test (they can run in parallel)
```

Each uses a few images from the daily image cap.
