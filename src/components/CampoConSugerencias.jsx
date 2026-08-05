export default function CampoConSugerencias({
  id,
  label,
  value,
  onChange,
  sugerencias,
  required,
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-marca-azul">
        {label}
      </label>
      <input
        id={id}
        list={`${id}-lista`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        placeholder="Escribe para buscar o crear nuevo"
      />
      <datalist id={`${id}-lista`}>
        {sugerencias.map((valor) => (
          <option key={valor} value={valor} />
        ))}
      </datalist>
    </div>
  );
}
