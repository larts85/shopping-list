import HomeLists from "../ui/list/homeLists";
import { defaultListName } from "../lib/listName";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Home</h1>
      <p className="page-description">
        Tus listas en curso, compartidas e invitaciones.
      </p>
      <HomeLists defaultName={defaultListName()} />
    </main>
  );
}
