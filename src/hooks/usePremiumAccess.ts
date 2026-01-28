import { useMemo } from "react";
import { useStripeSubscription } from "./useStripeSubscription";
import { useOwnedContent } from "./useOwnedContent";
import { useAuth } from "../contexts/AuthContext";

export const FREE_READ_SURAHS = [1, 2, 18, 36, 67, 112, 113, 114];

export const usePremiumAccess = () => {
  const assumeSubscribed =
    String(process.env.EXPO_PUBLIC_ASSUME_SUBSCRIBED).toLowerCase() === "true";
  const { user, isLoading: authLoading } = useAuth();
  const {
    hasReadAccess: hasReadSubscription,
    hasAudiobookAccess: hasAudiobookSubscription,
    loading: subscriptionLoading,
    hasCachedData,
  } = useStripeSubscription();
  const {
    hasOwnedAccess,
    hasFullOwnedAccess,
    ownedContent,
    loading: ownedLoading,
  } = useOwnedContent();

  const hasReadAccess = hasReadSubscription || hasFullOwnedAccess("read");
  const hasAudiobookAccess =
    hasAudiobookSubscription ||
    hasFullOwnedAccess("audiobook") ||
    hasFullOwnedAccess("listen");

  if (assumeSubscribed) {
    return {
      hasReadAccess: true,
      hasAudiobookAccess: true,
      hasPremiumAccess: true,
      loading: false,
      isContentFree: () => true,
      canAccessReadContent: () => true,
      canAccessFootnotes: () => true,
      canAccessAudioContent: () => true,
      ownedContent: [],
      hasOwnedAccess: () => true,
    };
  }

  const loading = useMemo(() => {
    if (authLoading) return true;
    if (!user) return false;
    if (hasCachedData) return false;
    return subscriptionLoading || ownedLoading;
  }, [authLoading, user, hasCachedData, subscriptionLoading, ownedLoading]);

  const isContentFree = (surahNumber: number, passageIndex: number = 0) => {
    if (FREE_READ_SURAHS.includes(surahNumber)) return true;
    if (passageIndex < 2) return true;
    return false;
  };

  const canAccessReadContent = (surahNumber: number, passageIndex: number = 0) => {
    if (isContentFree(surahNumber, passageIndex)) return true;
    if (hasReadSubscription) return true;
    if (hasOwnedAccess("read", surahNumber)) return true;
    return false;
  };

  const canAccessFootnotes = (surahNumber: number, passageIndex: number = 0) => {
    if (FREE_READ_SURAHS.includes(surahNumber)) return true;
    if (passageIndex < 2) return true;
    if (hasReadSubscription) return true;
    if (hasOwnedAccess("read", surahNumber)) return true;
    return false;
  };

  const canAccessAudioContent = (surahNumber: number) => {
    if (surahNumber === 1) return true;
    if (hasAudiobookSubscription) return true;
    if (hasOwnedAccess("audiobook", surahNumber) || hasOwnedAccess("listen", surahNumber))
      return true;
    return false;
  };

  return {
    hasReadAccess,
    hasAudiobookAccess,
    hasPremiumAccess: hasReadAccess || hasAudiobookAccess,
    loading,
    isContentFree,
    canAccessReadContent,
    canAccessFootnotes,
    canAccessAudioContent,
    ownedContent,
    hasOwnedAccess,
  };
};
