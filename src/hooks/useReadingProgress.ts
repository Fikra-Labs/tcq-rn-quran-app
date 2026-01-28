import { useState, useEffect, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./useToast";
import { useChallengeSync } from "./useChallengeSync";

interface ReadingProgress {
  surah_number: number;
  last_verse_read: number;
  completed: boolean;
  last_read_at: string;
  completed_at?: string;
}

interface ReadingStreak {
  current_streak: number;
  longest_streak: number;
  last_read_date: string;
}

export const useReadingProgress = () => {
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [streak, setStreak] = useState<ReadingStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { syncReadingProgress } = useChallengeSync();

  const fetchProgress = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreak = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && (error as { code?: string }).code !== "PGRST116") throw error;
      setStreak(data);
    } catch (error) {
      console.error("Error fetching streak:", error);
    }
  };

  const updateProgress = useCallback(
    async (surahNumber: number, verseNumber: number, totalVerses: number) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const completed = verseNumber >= totalVerses;

        const { error } = await supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            surah_number: surahNumber,
            last_verse_read: verseNumber,
            completed,
            last_read_at: new Date().toISOString(),
            completed_at: completed ? new Date().toISOString() : null,
          },
          {
            onConflict: "user_id,surah_number",
          }
        );

        if (error) throw error;

        const pagesRead = Math.max(1, Math.floor(verseNumber / 15));
        await syncReadingProgress(pagesRead);

        await supabase.rpc("update_reading_streak", { p_user_id: user.id });

        await fetchProgress();
        await fetchStreak();

        if (completed) {
          toast({
            title: "Surah completed!",
            description: "You've completed this Surah. Keep up the great work!",
          });
        }
      } catch (error) {
        console.error("Error updating progress:", error);
        toast({
          title: "Error",
          description: "Failed to update reading progress",
          variant: "destructive",
        });
      }
    },
    [syncReadingProgress, toast]
  );

  const getSurahProgress = (surahNumber: number) => {
    return progress.find((p) => p.surah_number === surahNumber);
  };

  const getCompletionPercentage = () => {
    const completed = progress.filter((p) => p.completed).length;
    return Math.round((completed / 114) * 100);
  };

  useEffect(() => {
    fetchProgress();
    fetchStreak();
  }, []);

  return {
    progress,
    streak,
    loading,
    updateProgress,
    getSurahProgress,
    getCompletionPercentage,
    refreshProgress: fetchProgress,
    refreshStreak: fetchStreak,
  };
};
