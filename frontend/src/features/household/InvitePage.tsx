import { useState } from "react";

import { useGenerateInvite } from "./hooks";

export function InvitePage() {
  const [inviteData, setInviteData] = useState<{
    token: string;
    expires_at: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const generateInvite = useGenerateInvite();

  async function handleGenerate() {
    try {
      const result = await generateInvite.mutateAsync();
      setInviteData(result);
      setCopied(false);
    } catch {
      // Error handled by toast in production
    }
  }

  async function handleCopy() {
    if (inviteData) {
      try {
        await navigator.clipboard.writeText(inviteData.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for non-HTTPS
      }
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md px-4">
      <h1 className="mb-6 text-2xl font-bold">Invite Members</h1>

      <button
        onClick={handleGenerate}
        disabled={generateInvite.isPending}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {generateInvite.isPending ? "Generating..." : "Generate Invite Token"}
      </button>

      {inviteData && (
        <div className="mt-6 rounded border p-4">
          <p className="mb-2 text-sm font-medium text-gray-600">
            Share this token with the new member:
          </p>
          <div className="mb-2 break-all rounded bg-gray-50 p-3 font-mono text-sm">
            {inviteData.token}
          </div>

          <button
            onClick={handleCopy}
            className="mb-2 rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>

          <p className="text-xs text-gray-500">
            Expires: {new Date(inviteData.expires_at).toLocaleString()}
          </p>

          <p className="mt-4 text-sm text-gray-600">
            Share this token with the person you want to invite. They will enter
            it during registration.
          </p>
        </div>
      )}
    </div>
  );
}