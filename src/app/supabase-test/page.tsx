"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

type ConnectionState =
  | { status: "checking" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function SupabaseTestPage() {
  const [connection, setConnection] = useState<ConnectionState>({ status: "checking" });

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (!url || !publishableKey) {
          throw new Error("Supabase environment variables are not configured");
        }

        createClient();

        const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
          headers: { apikey: publishableKey },
        });

        if (!response.ok) {
          throw new Error(`Supabase connection failed: ${response.status} ${response.statusText}`);
        }

        if (active) setConnection({ status: "success" });
      } catch (error) {
        if (active) {
          setConnection({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown Supabase connection error",
          });
        }
      }
    }

    void checkConnection();
    return () => { active = false; };
  }, []);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div><h1>Supabase Test</h1><p>Проверка конфигурации и доступности проекта</p></div>
      </div>
      <section className={`card supabase-test-card supabase-test-${connection.status}`}>
        {connection.status === "checking" && <><LoaderCircle size={25} /><div><strong>Connecting to Supabase…</strong><span>Checking project configuration</span></div></>}
        {connection.status === "success" && <><CheckCircle2 size={25} /><div><strong>Supabase connected successfully</strong><span>The browser client is ready</span></div></>}
        {connection.status === "error" && <><CircleAlert size={25} /><div><strong>Supabase connection error</strong><span>{connection.message}</span></div></>}
      </section>
    </div>
  );
}
