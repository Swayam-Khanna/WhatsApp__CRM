export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return cleaned.startsWith("0") ? `+91${cleaned.slice(1)}` : `+91${cleaned}`;
}

export function getOrCreateRecaptchaContainer(id: string) {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }
  const el = document.createElement("div");
  el.id = id;
  el.className = "hidden";
  document.body.appendChild(el);
  return el;
}
