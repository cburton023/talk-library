# Refreshing the talk list

Run twice a year, mid-April and mid-October (after General Conference). It only collects
talks newer than the last build, so it takes minutes, not hours.

**What you need:** the Claude desktop app's built-in browser on Collin's Mac (the cloud shell
can't reach these sites, so collection has to happen there), plus push access to
`cburton023/talk-library`.

1. Read `built` from `talks.json`; that's `SINCE`.
2. For each source in `refresh/collectors.js`: open its site in the built-in browser
   (request access to the site first), set `SINCE`, run the block, and poll
   `NEW.done` / `NEW.prog`. BYU-Idaho, BYU-Hawaii and Pathway wait 10 s between requests,
   so a few dozen new talks take several minutes.
   - BYU-Pathway: open https://www.byupathway.org/speeches and make sure the newest talks
     are on the page before running.
3. Get each result into this repo as `new-<src>.json`, for example by reading
   `JSON.stringify(NEW.talks)` from the page in slices of about 20,000 characters and
   writing them to a file. Check `NEW.errs` first.
4. `python3 refresh/add_new.py new-*.json`, then `python3 merge.py raw talks.json`.
   Check that the counts went up and nothing dropped.
   For a new General Conference, also add its sessions (the app's Conference tab groups talks by
   session): WebFetch https://www.churchofjesuschrist.org/study/general-conference/YYYY/MM?lang=eng
   with the prompt "List every session heading on this page, in order, and under each heading list
   the talk titles exactly as shown. Output as plain lines: \"## <session heading>\" then one title
   per line.", save the output as YYYY-MM.txt in an empty folder, run
   `python3 refresh/parse_sessions.py <that folder>`, then rerun `python3 merge.py raw talks.json`.
   Talks it can't place show up under "Other Talks", so check that group is empty.
5. Delete the `new-*.json` files, commit `raw/` and `talks.json`, and push to `main`.
   GitHub Pages republishes within about a minute, and everyone's app picks it up on its
   next open.

Commits must be authored as `Claude <noreply@anthropic.com>`.
