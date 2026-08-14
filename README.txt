VillageDeko final build

Files:
- index.html
- app.js
- style.css
- firebase-config.js
- firestore.rules

Features in this build:
- Google-only login gate before the app is visible.
- Instagram-style village photo feed.
- Every post shows Village + District + State.
- Tap a village/post to open its village feed/profile.
- Follow villages.
- Like, comment and share posts.
- Only the account that created a post can edit/delete it.
- Full-screen photo viewer.
- All 36 Indian States/UTs in the explorer.
- State pages show villages and that state's feed.
- Village listing with activities (+ per activity) and packages (+ days + per-person price).
- Optional private bank details in village listing.
- Profile drawer with listings, hosts, weddings, Chaupal, settings, privacy and logout.

Firebase:
1. Enable Google in Firebase Authentication > Sign-in method.
2. Publish firestore.rules in Firestore Database > Rules.
3. Add your GitHub Pages domain to Firebase Authentication > Settings > Authorized domains.
4. Upload the five files to the GitHub repository root.
