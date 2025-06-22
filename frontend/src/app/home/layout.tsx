import NavBar from "@/components/NavBar";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavBar />
      <main>{children}</main>
    </>
  );
} 