// Sealed answers: PBKDF2-SHA256 -> AES-256-GCM. The plaintext is not in the page; the key
// material is built from the player's live solution, so only a real solve opens it.
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function loadSealed() {
  const r = await fetch(new URL("./sealed.json", import.meta.url));
  return r.json();
}

// Returns the plaintext string, or null if the material is wrong.
export async function unseal(blob, material) {
  try {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(material), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: b64(blob.salt), iterations: blob.iter },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(blob.iv) }, key, b64(blob.ct));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
