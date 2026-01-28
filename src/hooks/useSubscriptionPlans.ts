import { useState, useEffect, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

export type BillingPeriod = "monthly" | "biannual" | "annual";
export type ProductType = "read" | "audiobook" | "bundle";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  product_type: ProductType;
  price_monthly: number;
  price_biannual: number;
  price_annual: number;
  currency: string;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_biannual_id: string | null;
  stripe_price_annual_id: string | null;
  display_order: number;
  category: string;
  features: string[];
  is_active: boolean;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;

      const formattedPlans: SubscriptionPlan[] = (data || []).map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        product_type: plan.product_type as ProductType,
        price_monthly: plan.price_monthly,
        price_biannual: plan.price_biannual,
        price_annual: plan.price_annual,
        currency: (plan as any).currency || "usd",
        stripe_product_id: (plan as any).stripe_product_id || null,
        stripe_price_monthly_id: (plan as any).stripe_price_monthly_id || null,
        stripe_price_biannual_id: (plan as any).stripe_price_biannual_id || null,
        stripe_price_annual_id: (plan as any).stripe_price_annual_id || null,
        display_order: (plan as any).display_order || 0,
        category: (plan as any).category || "main",
        features: Array.isArray(plan.features)
          ? (plan.features as unknown as string[]).filter(
              (f): f is string => typeof f === "string"
            )
          : [],
        is_active: plan.is_active ?? true,
      }));

      setPlans(formattedPlans);
      setError(null);
    } catch (err) {
      console.error("Error fetching subscription plans:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getPlanByProductType = (productType: ProductType) => {
    return plans.find((p) => p.product_type === productType);
  };

  const getPriceForPeriod = (plan: SubscriptionPlan, period: BillingPeriod) => {
    switch (period) {
      case "monthly":
        return plan.price_monthly;
      case "biannual":
        return plan.price_biannual;
      case "annual":
        return plan.price_annual;
    }
  };

  const getStripePriceId = (plan: SubscriptionPlan, period: BillingPeriod) => {
    switch (period) {
      case "monthly":
        return plan.stripe_price_monthly_id;
      case "biannual":
        return plan.stripe_price_biannual_id;
      case "annual":
        return plan.stripe_price_annual_id;
    }
  };

  const getMonthlyEquivalent = (
    plan: SubscriptionPlan,
    period: BillingPeriod
  ) => {
    const price = getPriceForPeriod(plan, period);
    switch (period) {
      case "monthly":
        return price;
      case "biannual":
        return price / 6;
      case "annual":
        return price / 12;
    }
  };

  const formatPrice = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const plansByCategory = plans.reduce((acc, plan) => {
    const category = plan.category || "main";
    if (!acc[category]) acc[category] = [];
    acc[category].push(plan);
    return acc;
  }, {} as Record<string, SubscriptionPlan[]>);

  const bundlePlan = plans.find((p) => p.product_type === "bundle");
  const individualPlans = plans.filter((p) => p.product_type !== "bundle");

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlanByProductType,
    getPriceForPeriod,
    getStripePriceId,
    getMonthlyEquivalent,
    formatPrice,
    plansByCategory,
    bundlePlan,
    individualPlans,
  };
};
