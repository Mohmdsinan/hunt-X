import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">Treasure Hunt</h1>
      <Link
        href="/scan"
        className="block rounded bg-black p-3 text-white"
      >
        Scan QR
      </Link>
    </main>
  );
}