import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "TutorPlan — кабинет репетитора",
  description: "Календарь, ученики и финансы репетитора в одном месте",
  icons: { icon: "/brand/favicon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="late-summer" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

const themeBootstrapScript = `
  (() => {
    try {
      const stored = localStorage.getItem("tutorplan-theme");
      const allowed = ["late-summer","summer-autumn","golden-autumn","late-autumn","autumn-winter","winter","winter-spring","spring","spring-summer","summer"];
      const now = new Date();
      const month = now.getMonth();
      const day = now.getDate();
      let automatic;
      if (month === 0 || (month === 1 && day <= 15) || (month === 11 && day > 15)) automatic = "winter";
      else if ((month === 1 && day > 15) || (month === 2 && day <= 15)) automatic = "winter-spring";
      else if ((month === 2 && day > 15) || month === 3) automatic = "spring";
      else if (month === 4) automatic = "spring-summer";
      else if (month === 5 || month === 6) automatic = "summer";
      else if (month === 7) automatic = "late-summer";
      else if (month === 8 && day <= 15) automatic = "summer-autumn";
      else if ((month === 8 && day > 15) || (month === 9 && day <= 15)) automatic = "golden-autumn";
      else if ((month === 9 && day > 15) || (month === 10 && day <= 15)) automatic = "late-autumn";
      else automatic = "autumn-winter";
      document.documentElement.dataset.theme = allowed.includes(stored) ? stored : automatic;
    } catch (_) {}
  })();
`;
