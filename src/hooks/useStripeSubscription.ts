import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import {
  useSubscriptionPlans,
  SubscriptionPlan,
  BillingPeriod,
  ProductType,
} from "./useSubscriptionPlans";

export interface ProductSubscription {
  subscribed: boolean;
  subscription_end: string | null;
}

export interface StripeSubscriptions {
  read: ProductSubscription;
  audiobook: ProductSubscription;
  bundle: ProductSubscription;
}

export type SubscriptionProduct = ProductType;
export type { BillingPeriod, ProductType, SubscriptionPlan };

const SUBSCRIPTION_CACHE_KEY = "subscription_status";
const SUBSCRIPTION_CACHE_EXPIRY_KEY = "subscription_status_expiry";
const CACHE_DURATION_MS = 3600000;

interface CachedSubscription {
  subscriptions: StripeSubscriptions;
  userId: string;
}

const DEFAULT_SUBSCRIPTIONS: StripeSubscriptions = {
  read: { subscribed: false, subscription_end: null },
  audiobook: { subscribed: false, subscription_end: null },
  bundle: { subscribed: false, subscription_end: null },
};

const getCachedSubscription = async (
  userId: string
): Promise<StripeSubscriptions | null> => {
  try {
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    const expiry = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_EXPIRY_KEY);
    if (!cached || !expiry) return null;
    if (Date.now() > parseInt(expiry, 10)) {
      await AsyncStorage.multiRemove([
        SUBSCRIPTION_CACHE_KEY,
        SUBSCRIPTION_CACHE_EXPIRY_KEY,
      ]);
      return null;
    }
    const parsed: CachedSubscription = JSON.parse(cached);
    if (parsed.userId !== userId) {
      await AsyncStorage.multiRemove([
        SUBSCRIPTION_CACHE_KEY,
        SUBSCRIPTION_CACHE_EXPIRY_KEY,
      ]);
      return null;
    }
    return parsed.subscriptions;
  } catch {
    return null;
  }
};

const cacheSubscription = async (
  userId: string,
  subscriptions: StripeSubscriptions
) => {
  try {
    const cached: CachedSubscription = { subscriptions, userId };
    await AsyncStorage.setItem(
      SUBSCRIPTION_CACHE_KEY,
      JSON.stringify(cached)
    );
    await AsyncStorage.setItem(
      SUBSCRIPTION_CACHE_EXPIRY_KEY,
      String(Date.now() + CACHE_DURATION_MS)
    );
  } catch {
    return;
  }
};

export const clearSubscriptionCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      SUBSCRIPTION_CACHE_KEY,
      SUBSCRIPTION_CACHE_EXPIRY_KEY,
    ]);
  } catch {
    return;
  }
};

export const getCachedSubscriptionExists = async (
  userId?: string
): Promise<boolean> => {
  if (!userId) return false;
  return (await getCachedSubscription(userId)) !== null;
};

export const useStripeSubscription = () => {
  const { user, session, isLoading: authLoading } = useAuth();
  const { plans, loading: plansLoading, getPlanByProductType, getStripePriceId } =
    useSubscriptionPlans();

  const inFlightRequestRef = useRef<Promise<void> | null>(null);
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const hasCompletedInitialCheckRef = useRef(false);
  const plansRef = useRef(plans);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  const [subscriptions, setSubscriptions] = useState<StripeSubscriptions>(
    DEFAULT_SUBSCRIPTIONS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    const loadCache = async () => {
      if (!user?.id) {
        setSubscriptions(DEFAULT_SUBSCRIPTIONS);
        setHasCachedData(false);
        setLoading(false);
        return;
      }

      const cached = await getCachedSubscription(user.id);
      if (cached) {
        setSubscriptions(cached);
        setHasCachedData(true);
        setLoading(false);
      }
    };

    loadCache();
  }, [user?.id]);

  const checkSubscription = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      const currentUser = user;
      const currentSession = session;
      const currentPlans = plansRef.current;

      if (!currentSession?.access_token || !currentUser) {
        setSubscriptions(DEFAULT_SUBSCRIPTIONS);
        setLoading(false);
        setHasCachedData(false);
        hasCompletedInitialCheckRef.current = true;
        return;
      }

      if (inFlightRequestRef.current && !options?.force) {
        return inFlightRequestRef.current;
      }

      const performCheck = async () => {
        try {
          if (!options?.silent && !hasCompletedInitialCheckRef.current) {
            setLoading(true);
          }

          const {
            data: { session: freshSession },
          } = await supabase.auth.getSession();
          if (!freshSession?.access_token) {
            setSubscriptions(DEFAULT_SUBSCRIPTIONS);
            setLoading(false);
            setHasCachedData(false);
            return;
          }

          const { data, error: fnError } = await supabase.functions.invoke(
            "check-subscription",
            {
              headers: {
                Authorization: `Bearer ${freshSession.access_token}`,
              },
            }
          );

          if (fnError) {
            if (fnError.message?.includes("Auth") || fnError.message?.includes("session")) {
              setSubscriptions(DEFAULT_SUBSCRIPTIONS);
              setLoading(false);
              setHasCachedData(false);
              return;
            }
            throw fnError;
          }

          if (data?.error) {
            if (data.error.includes("Auth") || data.error.includes("session")) {
              setSubscriptions(DEFAULT_SUBSCRIPTIONS);
              setLoading(false);
              setHasCachedData(false);
              return;
            }
            throw new Error(data.error);
          }

          const newSubscriptions: StripeSubscriptions = {
            read: { subscribed: false, subscription_end: null },
            audiobook: { subscribed: false, subscription_end: null },
            bundle: { subscribed: false, subscription_end: null },
          };

          if (data.subscriptions && Array.isArray(data.subscriptions)) {
            data.subscriptions.forEach(
              (sub: { product_id: string; subscription_end: string; status?: string }) => {
                if (sub.status === "canceled" || sub.status === "cancelled") {
                  return;
                }

                for (const plan of currentPlans) {
                  if (plan.stripe_product_id === sub.product_id) {
                    const productType =
                      plan.product_type as keyof StripeSubscriptions;
                    newSubscriptions[productType] = {
                      subscribed: true,
                      subscription_end: sub.subscription_end,
                    };

                    if (productType === "bundle") {
                      newSubscriptions.read = {
                        subscribed: true,
                        subscription_end: sub.subscription_end,
                      };
                      newSubscriptions.audiobook = {
                        subscribed: true,
                        subscription_end: sub.subscription_end,
                      };
                    }
                  }
                }
              }
            );
          }

          await cacheSubscription(currentUser.id, newSubscriptions);
          lastCheckedUserIdRef.current = currentUser.id;
          hasCompletedInitialCheckRef.current = true;

          setSubscriptions(newSubscriptions);
          setHasCachedData(true);
          setError(null);
        } catch (err) {
          console.error("Error checking subscription:", err);
          const errorMessage =
            err instanceof Error ? err.message : "Failed to check subscription";
          if (
            !errorMessage.includes("Auth") &&
            !errorMessage.includes("session")
          ) {
            setError(errorMessage);
          }
        } finally {
          setLoading(false);
          inFlightRequestRef.current = null;
        }
      };

      inFlightRequestRef.current = performCheck();
      return inFlightRequestRef.current;
    },
    [user, session]
  );

  useEffect(() => {
    if (authLoading || plansLoading) {
      return;
    }

    if (!session?.access_token || !user?.id) {
      setSubscriptions(DEFAULT_SUBSCRIPTIONS);
      setLoading(false);
      setHasCachedData(false);
      hasCompletedInitialCheckRef.current = true;
      return;
    }

    if (
      lastCheckedUserIdRef.current === user.id &&
      hasCompletedInitialCheckRef.current
    ) {
      return;
    }

    checkSubscription();
  }, [authLoading, plansLoading, user?.id, session?.access_token, checkSubscription]);

  useEffect(() => {
    if (!session?.access_token || !hasCompletedInitialCheckRef.current) return;

    const interval = setInterval(() => {
      checkSubscription({ silent: true, force: true });
    }, 3600000);

    return () => clearInterval(interval);
  }, [session?.access_token, checkSubscription]);

  const createCheckout = async (
    productType: ProductType,
    billingPeriod: BillingPeriod = "monthly",
    options?: { extendedTrial?: boolean; challengeEnrollmentId?: string }
  ) => {
    if (!session?.access_token) {
      throw new Error("You must be logged in to subscribe");
    }

    const plan = getPlanByProductType(productType);
    if (!plan) {
      throw new Error(`Plan not found for product type: ${productType}`);
    }

    const priceId = getStripePriceId(plan, billingPeriod);
    const body = priceId
      ? {
          planId: plan.id,
          billingPeriod,
          extendedTrial: options?.extendedTrial,
          challengeEnrollmentId: options?.challengeEnrollmentId,
        }
      : {
          priceId,
          extendedTrial: options?.extendedTrial,
          challengeEnrollmentId: options?.challengeEnrollmentId,
        };

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-checkout",
      {
        body,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);

    if (data?.url) {
      await Linking.openURL(data.url);
    }

    return data;
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error("You must be logged in to manage subscription");
    }

    const { data, error: fnError } = await supabase.functions.invoke(
      "customer-portal",
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);

    if (data?.url) {
      await Linking.openURL(data.url);
    }

    return data;
  };

  const isLoading = !hasCachedData && (authLoading || plansLoading || loading);

  return {
    subscriptions,
    loading: isLoading,
    error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    hasReadAccess: subscriptions.read.subscribed || subscriptions.bundle.subscribed,
    hasAudiobookAccess:
      subscriptions.audiobook.subscribed || subscriptions.bundle.subscribed,
    hasBundleAccess: subscriptions.bundle.subscribed,
    plans,
    hasCachedData,
  };
};
