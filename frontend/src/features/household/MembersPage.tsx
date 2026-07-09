import { useState } from "react";

import { useMembers, useRemoveMember } from "./hooks";

export function MembersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMembers(page, 20);
  const removeMember = useRemoveMember();

  async function handleRemove(userId: number) {
    if (window.confirm("Remove this member?")) {
      try {
        await removeMember.mutateAsync(userId);
      } catch {
        // Error handled by toast in production
      }
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading members...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Failed to load members</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Household Members</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-2 text-sm font-medium text-gray-600">
                Name
              </th>
              <th className="px-4 py-2 text-sm font-medium text-gray-600">
                Email
              </th>
              <th className="px-4 py-2 text-sm font-medium text-gray-600">
                Role
              </th>
              <th className="px-4 py-2 text-sm font-medium text-gray-600">
                Joined
              </th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="px-4 py-2">{member.name}</td>
                <td className="px-4 py-2 text-gray-600">{member.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {data.page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}