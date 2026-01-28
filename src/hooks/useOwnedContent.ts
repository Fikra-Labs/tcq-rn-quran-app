import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

export interface OwnedContentItem {
  id: string;
  content_product_id: string;
  source: "purchase" | "gift" | "admin_grant";
  gifted_by: string | null;
  gift_message: string | null;
  purchased_at: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    product_type: string;
    scope_type: string;
    scope_details: Record<string, unknown>;
  };
  gifter_profile?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

export const useOwnedContent = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [ownedContent, setOwnedContent] = useState<OwnedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedUserIdRef = useRef<string | null>(null);
  const inFlightRequestRef = useRef<Promise<void> | null>(null);
  const hasCompletedInitialFetchRef = useRef(false);

  const fetchOwnedContent = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user) {
        setOwnedContent([]);
        setLoading(false);
        hasCompletedInitialFetchRef.current = true;
        return;
      }

      if (
        !options?.force &&
        lastFetchedUserIdRef.current === user.id &&
        hasCompletedInitialFetchRef.current
      ) {
        return;
      }

      if (inFlightRequestRef.current && !options?.force) {
        return inFlightRequestRef.current;
      }

      const performFetch = async () => {
        try {
          if (!hasCompletedInitialFetchRef.current) {
            setLoading(true);
          }

          const { data: purchases, error: purchaseError } = await supabase
            .from("user_content_purchases")
            .select(
              `
            id,
            content_product_id,
            source,
            gifted_by,
            gift_message,
            purchased_at,
            content_products (
              id,
              name,
              description,
              product_type,
              scope_type,
              scope_details
            )
          `
            )
            .eq("user_id", user.id)
            .order("purchased_at", { ascending: false });

          if (purchaseError) throw purchaseError;

          const mappedContent: OwnedContentItem[] = [];

          for (const purchase of purchases || []) {
            const product = (purchase as any).content_products;
            if (!product) continue;

            let gifterProfile = null;

            if (purchase.gifted_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", purchase.gifted_by)
                .single();

              gifterProfile = profile;
            }

            mappedContent.push({
              id: purchase.id,
              content_product_id: purchase.content_product_id,
              source: (purchase.source || "purchase") as
                | "purchase"
                | "gift"
                | "admin_grant",
              gifted_by: purchase.gifted_by,
              gift_message: purchase.gift_message,
              purchased_at: purchase.purchased_at || new Date().toISOString(),
              product: {
                id: product.id,
                name: product.name,
                description: product.description,
                product_type: product.product_type,
                scope_type: product.scope_type,
                scope_details: product.scope_details as Record<string, unknown>,
              },
              gifter_profile: gifterProfile,
            });
          }

          lastFetchedUserIdRef.current = user.id;
          hasCompletedInitialFetchRef.current = true;
          setOwnedContent(mappedContent);
          setError(null);
        } catch (err) {
          console.error("Error fetching owned content:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch owned content");
        } finally {
          setLoading(false);
          inFlightRequestRef.current = null;
        }
      };

      inFlightRequestRef.current = performFetch();
      return inFlightRequestRef.current;
    },
    [user]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setOwnedContent([]);
      setLoading(false);
      hasCompletedInitialFetchRef.current = true;
      lastFetchedUserIdRef.current = null;
      return;
    }

    if (
      lastFetchedUserIdRef.current === user.id &&
      hasCompletedInitialFetchRef.current
    ) {
      return;
    }

    fetchOwnedContent();
  }, [authLoading, user, fetchOwnedContent]);

  const hasOwnedAccess = useCallback(
    (productType: string, surahNumber?: number): boolean => {
      return ownedContent.some((item) => {
        if (item.product.product_type !== productType) return false;

        if (item.product.scope_type === "full_quran") return true;

        if (item.product.scope_type === "surah" && surahNumber !== undefined) {
          const scopeSurah = (item.product.scope_details as { surah_number?: number })
            ?.surah_number;
          return scopeSurah === surahNumber;
        }

        if (item.product.scope_type === "juz") {
          return false;
        }

        return false;
      });
    },
    [ownedContent]
  );

  const getOwnedByType = useCallback(
    (productType: string): OwnedContentItem[] => {
      return ownedContent.filter((item) => item.product.product_type === productType);
    },
    [ownedContent]
  );

  const hasFullOwnedAccess = useCallback(
    (productType: string): boolean => {
      return ownedContent.some(
        (item) =>
          item.product.product_type === productType &&
          item.product.scope_type === "full_quran"
      );
    },
    [ownedContent]
  );

  const isLoading = !authLoading && loading && !hasCompletedInitialFetchRef.current;

  return {
    ownedContent,
    loading: isLoading,
    error,
    refetch: () => fetchOwnedContent({ force: true }),
    hasOwnedAccess,
    getOwnedByType,
    hasFullOwnedAccess,
  };
};
