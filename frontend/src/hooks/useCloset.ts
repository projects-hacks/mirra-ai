"use client";

import { useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import type { ClosetItem } from "@/types";

interface ClosetRow {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string | null;
  brand: string | null;
  purchase_price: number | null;
}

/** Hook: fetches and manages closet items from Supabase. */
export function useCloset() {
  const dispatch = useAppDispatch();
  const { user, closetItems } = useAppState();

  // Fetch closet on user login
  useEffect(() => {
    if (!user) return;

    async function fetchCloset() {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("closet_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const items: ClosetItem[] = (data as ClosetRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          color: row.color ?? "",
          imageUrl: row.image_url ?? "",
          brand: row.brand ?? undefined,
          purchasePrice: row.purchase_price ?? undefined,
        }));
        dispatch({ type: "SET_CLOSET", payload: items });
      }
    }

    fetchCloset();
  }, [user, dispatch]);

  const addItem = useCallback(
    async (item: Omit<ClosetItem, "id">) => {
      if (!user) return;
      const supabase = getSupabase();

      const insertPayload = {
        user_id: user.id,
        name: item.name,
        category: item.category,
        color: item.color,
        image_url: item.imageUrl,
        brand: item.brand,
        purchase_price: item.purchasePrice,
      } as unknown as never;

      const { data, error } = await supabase
        .from("closet_items")
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        const item = data as ClosetRow;
        dispatch({
          type: "SET_CLOSET",
          payload: [
            {
              id: item.id,
              name: item.name,
              category: item.category,
              color: item.color ?? "",
              imageUrl: item.image_url ?? "",
              brand: item.brand ?? undefined,
              purchasePrice: item.purchase_price ?? undefined,
            },
            ...closetItems,
          ],
        });
      }
    },
    [user, closetItems, dispatch]
  );

  return { closetItems, addItem };
}
