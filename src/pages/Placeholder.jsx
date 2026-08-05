export default function Placeholder({ title }) {
  return (
    <div className="border-4 border-dashed border-marca-azul/30 p-12 text-center">
      <h1 className="text-2xl font-black uppercase text-marca-azul">{title}</h1>
      <p className="mt-2 font-bold text-marca-rojo">Próximamente</p>
    </div>
  );
}
