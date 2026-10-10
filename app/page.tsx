import Authenticate from "./ui/authenticate";
import "./globals.css";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Authenticate />
      </div>
    </main>
  );
}
