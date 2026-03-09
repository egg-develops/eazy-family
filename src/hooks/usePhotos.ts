import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Photo {
  id: string;
  title?: string;
  storage_path: string;
  thumbnail_path?: string;
  location?: string;
  date_taken?: string;
  tags: string[];
  ai_enhanced: boolean;
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .order('date_taken', { ascending: false, nullsLast: true });

      if (fetchError) throw fetchError;
      setPhotos((data || []) as Photo[]);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();

    // Set up realtime subscription
    const channel = supabase
      .channel('photos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos',
        },
        () => {
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uploadPhoto = async (file: File, metadata?: {
    title?: string;
    location?: string;
    tags?: string[];
  }) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `memories/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      // Save metadata to database
      const { data, error: dbError } = await supabase
        .from('photos')
        .insert([{
          storage_path: filePath,
          title: metadata?.title || file.name,
          location: metadata?.location,
          date_taken: new Date().toISOString(),
          tags: metadata?.tags || [],
          ai_enhanced: false,
        }])
        .select();

      if (dbError) throw dbError;

      setPhotos([...(data || []), ...photos]);
      return {
        id: data?.[0]?.id,
        url: publicUrl,
        path: filePath,
      };
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw err;
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      const photo = photos.find(p => p.id === id);
      if (!photo) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-uploads')
        .remove([photo.storage_path]);

      if (storageError) console.warn('Storage delete warning:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setPhotos(photos.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting photo:', err);
      throw err;
    }
  };

  return {
    photos,
    loading,
    error,
    uploadPhoto,
    deletePhoto,
    refetch: loadPhotos,
  };
}
