// app/lib/utils.ts

// Function to generate unique IDs
export function generateId(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

// Function to format date as MM/DD/YY
export function formatDate(date: string) {
  if (!date) return "";
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`;
}
