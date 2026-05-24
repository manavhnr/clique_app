import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/PostCard';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (pageNum = 1, reset = false) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${pageNum}&limit=15`);
      const newPosts = data.data?.posts ?? [];
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === 15);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setLoading(true);
      fetchFeed(1, true).finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchFeed(1, true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    await fetchFeed(next);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator color="#7C3AED" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark">
      <View className="px-5 pt-14 pb-3 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">CLIQUE</Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-24">
            <Ionicons name="moon-outline" size={48} color="#6B7280" />
            <Text className="text-white text-lg font-semibold mt-4">Your feed is quiet</Text>
            <Text className="text-muted text-sm mt-1">Follow people and hosts to see their posts</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
