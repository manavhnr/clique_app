import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import EventCard from '@/components/EventCard';

const CATEGORIES = ['All', 'Tonight', 'This Weekend', 'Near Me', 'House Party', 'Club', 'College', 'Free'];

export default function EventsScreen() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchEvents = async (q = '', cat = 'All') => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (cat === 'Tonight') params.date = 'tonight';
      else if (cat === 'This Weekend') params.date = 'weekend';
      else if (cat === 'House Party') params.category = 'house_party';
      else if (cat === 'Club') params.category = 'club';
      else if (cat === 'College') params.category = 'college';
      else if (cat === 'Free') { params.minPrice = '0'; params.maxPrice = '0'; }
      const { data } = await api.get('/events/search', { params });
      setEvents(data.data?.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(query, activeCategory);
  }, [activeCategory]);

  const handleSearch = () => fetchEvents(query, activeCategory);

  return (
    <View className="flex-1 bg-dark">
      <View className="px-5 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold mb-4">Events</Text>

        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-4">
          <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-white text-sm py-3"
            placeholder="Search events, hosts, vibes..."
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`mx-1 px-4 py-2 rounded-full border ${
                activeCategory === cat ? 'bg-primary border-primary' : 'border-dark-border'
              }`}
            >
              <Text className={activeCategory === cat ? 'text-white text-sm font-medium' : 'text-muted text-sm'}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <EventCard event={item} onPress={() => router.push(`/event/${item._id}`)} />}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center pt-16">
              <Ionicons name="calendar-outline" size={48} color="#6B7280" style={{ marginBottom: 12 }} />
              <Text className="text-white text-lg font-semibold">No events found</Text>
              <Text className="text-muted text-sm mt-1">Try a different search or category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
