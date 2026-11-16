import { createHash } from "node:crypto";

let firebasePromise;

async function firebaseServices() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [{ getApps, initializeApp }, { getAuth }, { getFirestore, FieldValue }] = await Promise.all([
        import("firebase-admin/app"),
        import("firebase-admin/auth"),
        import("firebase-admin/firestore")
      ]);
      const app = getApps()[0] || initializeApp();
      return { auth: getAuth(app), db: getFirestore(app), FieldValue };
    })();
  }
  return firebasePromise;
}

export async function verifyFirebaseUser(token) {
  const { auth } = await firebaseServices();
  return auth.verifyIdToken(token, true);
}

export async function enforceFirestoreRateLimit(uid, { limit = 20, windowSeconds = 60 } = {}) {
  const { db, FieldValue } = await firebaseServices();
  const key = createHash("sha256").update(uid).digest("hex");
  const ref = db.collection("_ai_rate_limits").doc(key);
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() : null;
    const count = current?.windowStart === windowStart ? Number(current.count || 0) : 0;
    if (count >= limit) {
      const error = new Error("Request limit reached. Try again later.");
      error.status = 429;
      throw error;
    }
    transaction.set(ref, {
      windowStart,
      count: count + 1,
      expiresAt: new Date(windowStart + windowSeconds * 2000),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
}
