import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { Sidebar } from "@/components/Sidebar";
import { AppStateProvider } from "@/components/AppStateProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ManuMind AI",
  description: "AI-Powered Manufacturing Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <AppStateProvider>
              <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </AppStateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
