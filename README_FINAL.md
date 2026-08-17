# VillageDeko — Final Frontend Base

This package keeps the approved modern VillageDeko frontend as the working base.

## Media / data architecture
- Photos and videos: Cloudinary
- Photo/video delivery: Cloudinary CDN
- Village/profile/listing data: Firebase Firestore
- Authentication: Firebase Authentication
- Google sign-in: enabled in the intended architecture

## Public configuration
See `villagedeko-config.js`.
Never add a Firebase private service-account key or Cloudinary API Secret to browser code.

## Important
This package is the frontend/configuration base. Firebase Auth/Firestore runtime wiring should only be enabled after the Firebase Console providers, Firestore collections/rules, and ownership rules are confirmed.
