export const unmaskPhone = (value: string) => {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
};

export const formatPhoneBR = (value: string) => {
  const digits = unmaskPhone(value);
  const d1 = digits.slice(0, 2);
  const d2 = digits.slice(2, 6);
  const d3 = digits.slice(6, 10);

  if (!digits.length) return "";

  let out = "";
  // DDD
  out += `(${d1}`;
  if (digits.length >= 2) out += ") ";
  // Primeira parte
  out += d2;
  if (digits.length >= 6) out += "-";
  // Segunda parte
  out += d3;

  return out;
};