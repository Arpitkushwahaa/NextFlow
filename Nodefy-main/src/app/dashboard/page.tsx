import { useUser, useClerk } from "@clerk/nextjs";
import React from "react";

export default function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  return <div>Dashboard for {user?.firstName} <button onClick={() => signOut()}>Sign Out</button></div>;
}