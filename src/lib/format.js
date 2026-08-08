export function formatoCLP(numero) {
  if (numero === null || numero === undefined || Number.isNaN(numero)) return "—";
  return numero.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });
}
