import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./useToast";

interface Bookmark {
  id: string;
  surah_number: number;
  verse_number: number;
  note?: string;
  created_at: string;
}

interface ThematicBookmark {
  id: string;
  passage_id: string;
  surah_number: number;
  theme_name: string;
  note?: string;
  created_at: string;
}

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [thematicBookmarks, setThematicBookmarks] = useState<ThematicBookmark[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBookmarks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: verseData, error: verseError } = await supabase
        .from("verse_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (verseError) throw verseError;
      setBookmarks(verseData || []);

      const { data: thematicData, error: thematicError } = await supabase
        .from("thematic_passage_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (thematicError) throw thematicError;
      setThematicBookmarks(thematicData || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const isBookmarked = (surahNumber: number, verseNumber: number) => {
    return bookmarks.some(
      (b) => b.surah_number === surahNumber && b.verse_number === verseNumber
    );
  };

  const addBookmark = async (
    surahNumber: number,
    verseNumber: number,
    note?: string
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in to bookmark",
        description: "Please sign in to save verses",
        variant: "destructive",
      });
      return;
    }

    const optimisticBookmark: Bookmark = {
      id: `temp-${Date.now()}`,
      surah_number: surahNumber,
      verse_number: verseNumber,
      note,
      created_at: new Date().toISOString(),
    };

    setBookmarks((prev) => [optimisticBookmark, ...prev]);

    try {
      const { error } = await supabase.from("verse_bookmarks").insert({
        user_id: user.id,
        surah_number: surahNumber,
        verse_number: verseNumber,
        note,
      });

      if (error) throw error;

      fetchBookmarks();

      toast({
        title: "Bookmark added",
        description: `Surah ${surahNumber}, Verse ${verseNumber} has been bookmarked`,
      });
    } catch (error: any) {
      setBookmarks((prev) => prev.filter((b) => b.id !== optimisticBookmark.id));

      if (error?.code === "23505") {
        toast({
          title: "Already bookmarked",
          description: "This verse is already in your bookmarks",
        });
      } else {
        console.error("Error adding bookmark:", error);
        toast({
          title: "Error",
          description: "Failed to add bookmark",
          variant: "destructive",
        });
      }
    }
  };

  const removeBookmark = async (surahNumber: number, verseNumber: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const previousBookmarks = [...bookmarks];

    setBookmarks((prev) =>
      prev.filter(
        (b) =>
          !(b.surah_number === surahNumber && b.verse_number === verseNumber)
      )
    );

    try {
      const { error } = await supabase
        .from("verse_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("surah_number", surahNumber)
        .eq("verse_number", verseNumber);

      if (error) throw error;

      toast({
        title: "Bookmark removed",
        description: `Surah ${surahNumber}, Verse ${verseNumber} bookmark has been removed`,
      });
    } catch (error) {
      setBookmarks(previousBookmarks);
      console.error("Error removing bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const toggleBookmark = async (surahNumber: number, verseNumber: number) => {
    if (isBookmarked(surahNumber, verseNumber)) {
      await removeBookmark(surahNumber, verseNumber);
    } else {
      await addBookmark(surahNumber, verseNumber);
    }
  };

  const isThematicPassageBookmarked = (passageId: string) => {
    return thematicBookmarks.some((b) => b.passage_id === passageId);
  };

  const addThematicPassageBookmark = async (
    passageId: string,
    surahNumber: number,
    themeName: string,
    note?: string
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in to bookmark",
        description: "Please sign in to save themes",
        variant: "destructive",
      });
      return;
    }

    const optimisticBookmark: ThematicBookmark = {
      id: `temp-${Date.now()}`,
      passage_id: passageId,
      surah_number: surahNumber,
      theme_name: themeName,
      note,
      created_at: new Date().toISOString(),
    };

    setThematicBookmarks((prev) => [optimisticBookmark, ...prev]);

    try {
      const { error } = await supabase.from("thematic_passage_bookmarks").insert({
        user_id: user.id,
        passage_id: passageId,
        surah_number: surahNumber,
        theme_name: themeName,
        note,
      });

      if (error) throw error;

      fetchBookmarks();

      toast({
        title: "Theme bookmarked",
        description: `"${themeName}" has been saved to your bookmarks`,
      });
    } catch (error: any) {
      setThematicBookmarks((prev) =>
        prev.filter((b) => b.id !== optimisticBookmark.id)
      );

      if (error?.code === "23505") {
        toast({
          title: "Already bookmarked",
          description: "This theme is already in your bookmarks",
        });
      } else {
        console.error("Error adding thematic bookmark:", error);
        toast({
          title: "Error",
          description: "Failed to add bookmark",
          variant: "destructive",
        });
      }
    }
  };

  const removeThematicPassageBookmark = async (passageId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const previousBookmarks = [...thematicBookmarks];
    const bookmark = thematicBookmarks.find((b) => b.passage_id === passageId);

    setThematicBookmarks((prev) =>
      prev.filter((b) => b.passage_id !== passageId)
    );

    try {
      const { error } = await supabase
        .from("thematic_passage_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("passage_id", passageId);

      if (error) throw error;

      toast({
        title: "Bookmark removed",
        description: `"${bookmark?.theme_name}" has been removed from your bookmarks`,
      });
    } catch (error) {
      setThematicBookmarks(previousBookmarks);
      console.error("Error removing thematic bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const toggleThematicPassageBookmark = async (
    passageId: string,
    surahNumber: number,
    themeName: string
  ) => {
    if (isThematicPassageBookmarked(passageId)) {
      await removeThematicPassageBookmark(passageId);
    } else {
      await addThematicPassageBookmark(passageId, surahNumber, themeName);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const getNotesOnly = () => {
    const verseNotes = bookmarks.filter((b) => b.note && b.note.trim() !== "");
    const passageNotes = thematicBookmarks.filter(
      (b) => b.note && b.note.trim() !== ""
    );
    return { verseNotes, passageNotes };
  };

  const updateVerseNote = async (
    surahNumber: number,
    verseNumber: number,
    note: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("verse_bookmarks")
        .update({ note })
        .eq("user_id", user.id)
        .eq("surah_number", surahNumber)
        .eq("verse_number", verseNumber);

      if (error) throw error;

      await fetchBookmarks();

      toast({
        title: "Note updated",
        description: "Your note has been saved",
      });
    } catch (error) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const updateThematicNote = async (passageId: string, note: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("thematic_passage_bookmarks")
        .update({ note })
        .eq("user_id", user.id)
        .eq("passage_id", passageId);

      if (error) throw error;

      await fetchBookmarks();

      toast({
        title: "Note updated",
        description: "Your note has been saved",
      });
    } catch (error) {
      console.error("Error updating thematic note:", error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  return {
    bookmarks,
    thematicBookmarks,
    loading,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isThematicPassageBookmarked,
    addThematicPassageBookmark,
    removeThematicPassageBookmark,
    toggleThematicPassageBookmark,
    refreshBookmarks: fetchBookmarks,
    getNotesOnly,
    updateVerseNote,
    updateThematicNote,
  };
};
