export const truncate = (str: string, length = 50): string =>
  str.length > length ? `${str.slice(0, length)}...` : str;

export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

export const maskPhone = (phone: string): string => {
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-3);
};

export const formatNationalCode = (code: string): string =>
  code.replace(/(\d{3})(\d{6})(\d{1})/, "$1-$2-$3");

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
