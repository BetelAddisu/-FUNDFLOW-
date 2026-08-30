import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">FundFlow</h1>
      <div className="space-x-4">
        <Link href="/apply" className="text-blue-500 underline">
          Applicant
        </Link>
        <Link href="/review" className="text-blue-500 underline">
          Reviewer
        </Link>
      </div>
    </main>
  );
}