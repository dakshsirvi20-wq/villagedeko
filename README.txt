VillageDeko - Cloudinary + Firebase bundle

Included:
- index.html
- app.js
- style.css
- firebase-config.js
- media-config.js
- firestore.rules

Image storage:
- Legacy external image host removed.
- Post images, village gallery images, and profile photos upload to Cloudinary.
- Firebase/Firestore stores the Cloudinary URL and app metadata.

Cloudinary setup used:
- Cloud name: cyo6vdu5
- Upload preset: unsigned_preset

Security:
- Do not add the Cloudinary API Secret to frontend code.
- Firebase client config is intended for browser use; enforce access with Firestore Security Rules.
