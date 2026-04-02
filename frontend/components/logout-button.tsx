"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <Button className="cursor-pointer" onClick={logout}>
      Logout
    </Button>
  );
}
