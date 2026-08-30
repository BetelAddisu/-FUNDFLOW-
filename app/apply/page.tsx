'use client';

import { useState } from 'react';

export default function ApplyPage() {
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('userId', 'demo-user');
    formData.append('sessionId', 'demo-session');
    if (text) formData.append('text', text);
    if (audio) formData.append('audio', audio);
    if (photos) {
      for (let i = 0; i < photos.length; i++) {
        formData.append('photos', photos[i]);
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-4">Applicant Chat</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block">Message</label>
          <textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border p-2"
            rows={3}
          />
        </div>
        <div>
          <label className="block">Voice note</label>
          <input
            type="file"
            name="audio"
            accept="audio/*"
            onChange={(e) => setAudio(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label className="block">Photos</label>
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(e.target.files)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Send'}
        </button>
      </form>

      {error && (
        <div data-testid="error-message" className="mt-4 text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <h3 className="font-medium">Application Pack</h3>
          <div data-testid="gap-list">
            <h4>Gaps</h4>
            {result.metadata?.applicationPack?.gaps?.map((gap: any, idx: number) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{gap.field}</span> - {gap.message}
              </div>
            ))}
          </div>
          <div data-testid="sdg-suggestion">
            <h4>SDG Suggestions</h4>
            {result.metadata?.applicationPack?.sdgSuggestions?.map((s: any, idx: number) => (
              <div key={idx}>
                {s.title} ({s.alignmentStatus})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}