import SharedData from "../../ui/data/sharedData";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Datos compartidos</h1>
      <p className="page-description">
        Organiza las compras junto a las personas de tu hogar.
      </p>
      <div className="mt-8 space-y-6">
        <SharedData />
      </div>
    </main>
  );
}
