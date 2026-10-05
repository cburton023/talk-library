# Sync service setup (one time, free)

The app keeps one saved copy of each person's history per email in a tiny Cloudflare Worker.
No passwords; the email itself (scrambled with SHA-256 in the app) is the key.

1. Create a free account at https://dash.cloudflare.com/sign-up and verify your email.
2. **Storage & Databases → KV → Create**: name it `talk-sync-data`.
3. **Workers & Pages → Create → Start with Hello World**: name it `talk-sync`, then **Deploy**.
4. **Edit code**: replace everything with `sync/worker.js` from this repo, then **Deploy**.
5. In the worker, **Settings → Bindings → Add → KV namespace**: variable name `TALKS`,
   namespace `talk-sync-data`. Save/deploy.
6. Open the worker's URL (live: https://talk-sync.cburton023.workers.dev); it should show
   `{"ok":true,"service":"talk-sync"}`. Put that URL in `SYNC_URL` in `index.html`.

Free plan: 100,000 reads and 1,000 saves per day. The app saves when you pause, finish,
favorite, edit a playlist or leave the app, not every few seconds.
