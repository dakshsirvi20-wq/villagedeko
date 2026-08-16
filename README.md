# VillageDeko Final Tourism Build

Fresh VillageDeko frontend rebuilt around the finalized village-tourism roadmap.

## Backend compatibility
- Firebase project/config reused from the previous VillageDeko build.
- Cloudinary cloud name and unsigned upload preset reused from the previous VillageDeko build.
- Firebase Firestore stores village listings, village stories/media metadata, booking enquiries, wedding enquiries, products and challenge entries.
- Cloudinary stores uploaded images and videos; only their secure URLs are stored in Firestore.

## Important
Do not add a Cloudinary API Secret to frontend code.

## Main collections
`villagesListings`, `villageStories`, `bookingInquiries`, `weddingEvents`, `weddingInquiries`, `products`, `challengeEntries`, `people`.

## Product direction
This build intentionally removes the old social-media behavior: no likes, comments, shares or village follows, and no Chaupal. Village profiles and tourism experiences are the primary destination.
