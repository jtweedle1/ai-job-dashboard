import AppShell from "@/components/AppShell";

export default function BackgroundLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
