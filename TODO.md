# TODO
- [x] Replace file-based users persistence (users.json) with in-memory storage to avoid EROFS in serverless
- [x] Update `api/auth/usersStore.js` to remove fs writes
- [ ] (Optional) Seed in-memory store from existing `users.json` on first load (best-effort)
- [ ] Test sign-up/sign-in locally
- [ ] Redeploy and verify the form submission no longer fails with EROFS

