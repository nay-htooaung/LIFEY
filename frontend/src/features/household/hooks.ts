import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { InviteResponseData, MemberOut } from "./types";

export function useMembers(page: number, pageSize: number) {
  return useQuery({
    queryKey: ["household", "members", { page, pageSize }],
    queryFn: async () => {
      return (await api.get(
        `/households/members?page=${page}&page_size=${pageSize}`,
      )) as unknown as {
        items: MemberOut[];
        total: number;
        page: number;
        page_size: number;
        pages: number;
      };
    },
    staleTime: 30_000,
  });
}

export function useGenerateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return (await api.post(
        "/households/invites",
      )) as unknown as InviteResponseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/households/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household", "members"] });
    },
  });
}