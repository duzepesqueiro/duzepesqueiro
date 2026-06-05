export const unmaskPhone = (value: string) => {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
};

export const formatPhoneBR = (value: string) => {
  const digits = unmaskPhone(value);

  if (!digits.length) return "";

  const ddd = digits.slice(0, 2);
  const part1 = digits.slice(2, 7);
  const part2 = digits.slice(7, 11);

  let out = `(${ddd}`;
  if (digits.length >= 2) out += ") ";
  out += part1;
  if (digits.length >= 7) out += "-";
  out += part2;

  return out;
};