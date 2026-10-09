import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

type Category = 'Tous' | 'Voyages' | 'Famille' | 'Travail' | 'Animaux' | 'Autre';

type PhotoItem = {
  id: string;
  uri: string;
  label: string;
  category: Exclude<Category, 'Tous'>;
  date: string;
};

const STORAGE_KEY = 'photosort-photos-v1';
const FILTERS: Category[] = ['Tous', 'Voyages', 'Famille', 'Travail', 'Animaux', 'Autre'];

const initialPhotos: PhotoItem[] = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    label: 'Plage du week-end',
    category: 'Voyages',
    date: '2024-05-18',
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
    label: 'Chien de la famille',
    category: 'Animaux',
    date: '2024-06-02',
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
    label: 'Réunion équipe',
    category: 'Travail',
    date: '2024-07-11',
  },
];

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos)).catch(() => {
      Alert.alert('Erreur', 'Impossible de sauvegarder votre organisation de photos.');
    });
  }, [photos, isLoaded]);

  const loadPhotos = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as PhotoItem[];
        setPhotos(parsed);
      } else {
        setPhotos(initialPhotos);
      }
    } catch {
      setPhotos(initialPhotos);
    } finally {
      setIsLoaded(true);
    }
  };

  const filteredPhotos = useMemo(() => {
    if (selectedCategory === 'Tous') {
      return [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return photos
      .filter((photo) => photo.category === selectedCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [photos, selectedCategory]);

  const stats = useMemo(() => {
    const total = photos.length;
    const categories = FILTERS.filter((item) => item !== 'Tous').map((category) => ({
      category,
      count: photos.filter((photo) => photo.category === category).length,
    }));
    const topCategory = categories.sort((a, b) => b.count - a.count)[0];

    return {
      total,
      topCategory: topCategory?.category ?? 'Autre',
      topCount: topCategory?.count ?? 0,
    };
  }, [photos]);

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès à votre galerie pour ajouter des photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const newPhoto: PhotoItem = {
      id: `${Date.now()}`,
      uri: asset.uri,
      label: `Photo ${photos.length + 1}`,
      category: selectedCategory === 'Tous' ? 'Autre' : selectedCategory,
      date: new Date().toISOString().slice(0, 10),
    };

    setPhotos((current) => [newPhoto, ...current]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Application</Text>
            <Text style={styles.title}>PhotoSort</Text>
          </View>

          <Pressable style={styles.addButton} onPress={handleAddPhoto}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Catégorie</Text>
            <Text style={styles.statValue}>{stats.topCategory}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Photos</Text>
            <Text style={styles.statValue}>{stats.topCount}</Text>
          </View>
        </View>

        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Tri</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map((filter) => {
              const isActive = selectedCategory === filter;

              return (
                <Pressable
                  key={filter}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(filter)}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.gallerySection}>
          <Text style={styles.sectionTitle}>Galerie</Text>

          {filteredPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Aucune photo ici</Text>
              <Text style={styles.emptyText}>Ajoutez des images pour commencer à organiser votre bibliothèque.</Text>
            </View>
          ) : (
            <View style={styles.galleryGrid}>
              {filteredPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoLabel}>{photo.label}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.photoDate}>{photo.date}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{photo.category}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#081325',
  },
  container: {
    flex: 1,
    backgroundColor: '#081325',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 24,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  filtersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#dbeafe',
  },
  filterText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0f172a',
  },
  gallerySection: {
    marginBottom: 28,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoCard: {
    width: cardWidth,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  photoImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1e293b',
  },
  photoInfo: {
    padding: 12,
  },
  photoLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoDate: {
    color: '#94a3b8',
    fontSize: 11,
  },
  categoryBadge: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryBadgeText: {
    color: '#eff6ff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
