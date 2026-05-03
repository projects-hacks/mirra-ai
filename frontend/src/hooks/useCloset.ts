"use client";

import { useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import type { ClosetItem } from "@/types";

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
        const items: ClosetItem[] = data.map((row: Record<string, any>) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          color: row.color ?? "",
          imageUrl: row.image_url ?? "",
          brand: row.brand,
          purchasePrice: row.purchase_price,
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

      const { data, error } = await supabase
        .from("closet_items")
        .insert({
          user_id: user.id,
          name: item.name,
          category: item.category,
          color: item.color,
          image_url: item.imageUrl,
          brand: item.brand,
          purchase_price: item.purchasePrice,
        } as any)
        .select()
        .single();

      if (!error && data) {
        const item = data as any;
        dispatch({
          type: "SET_CLOSET",
          payload: [
            {
              id: item.id,
              name: item.name,
              category: item.category,
              color: item.color ?? "",
              imageUrl: item.image_url ?? "",
              brand: item.brand,
              purchasePrice: item.purchase_price,
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
