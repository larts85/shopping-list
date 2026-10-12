import SharedData from "../../ui/data/sharedData";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Accesos y configuración</h1>
      <p className="page-description">
        Gestiona el nombre y los permisos de la lista activa.
      </p>
      <div className="mt-8 space-y-6">
        <SharedData />
      </div>
    </main>
  );
}
