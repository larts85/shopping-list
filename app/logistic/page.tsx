import React from "react";
import List from "../ui/list/list";
import { checkFolderExists } from "../actions/googleDrive";
import { redirect, unstable_rethrow } from "next/navigation";

export default async function Home() {
  let folderExists;
  try {
    const folderName = "homeLogistic";
    folderExists = await checkFolderExists(folderName);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error checking folder:", error);
    redirect("/");
  }
  if (!folderExists) redirect("/no-data/");
  return (
    <main className="bg-white min-h-screen">
      <List />
    </main>
  );
}
