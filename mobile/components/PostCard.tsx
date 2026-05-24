import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useState } from 'react';

type Props = { post: any };

export default function PostCard({ post }: Props) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const router = useRouter();

  const toggleLike = async () => {
    try {
      if (liked) {
        await api.delete(`/posts/${post._id}/like`);
        setLikeCount((p: number) => p - 1);
      } else {
        await api.post(`/posts/${post._id}/like`);
        setLikeCount((p: number) => p + 1);
      }
      setLiked(!liked);
    } catch {}
  };

  return (
    <View className="bg-dark-card border border-dark-border rounded-2xl mb-3 overflow-hidden">
      <TouchableOpacity
        onPress={() => router.push(`/user/${post.userId?._id}`)}
        className="flex-row items-center px-4 py-3"
      >
        <View className="w-9 h-9 rounded-full bg-dark-border items-center justify-center mr-3">
          {post.userId?.profileImage ? (
            <Image source={{ uri: post.userId.profileImage }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <Ionicons name="person" size={18} color="#6B7280" />
          )}
        </View>
        <View>
          <Text className="text-white text-sm font-semibold">{post.userId?.name ?? 'User'}</Text>
          <Text className="text-muted text-xs">@{post.userId?.username ?? ''}</Text>
        </View>
        {post.userId?.isVerifiedHost && (
          <Ionicons name="checkmark-circle" size={14} color="#7C3AED" style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>

      {post.text ? (
        <Text className="text-white text-sm px-4 pb-3 leading-5">{post.text}</Text>
      ) : null}

      {post.mediaUrls?.[0] ? (
        <Image source={{ uri: post.mediaUrls[0] }} className="w-full h-64" resizeMode="cover" />
      ) : null}

      {post.linkedEventId ? (
        <TouchableOpacity
          onPress={() => router.push(`/event/${post.linkedEventId._id}`)}
          className="mx-4 my-3 bg-primary/10 border border-primary/30 rounded-xl p-3 flex-row items-center"
        >
          <Ionicons name="calendar-outline" size={16} color="#7C3AED" style={{ marginRight: 8 }} />
          <Text className="text-primary text-sm font-medium flex-1" numberOfLines={1}>
            {post.linkedEventId.title}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
        </TouchableOpacity>
      ) : null}

      <View className="flex-row items-center px-4 py-3 gap-5 border-t border-dark-border">
        <TouchableOpacity onPress={toggleLike} className="flex-row items-center gap-1.5">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#f87171' : '#6B7280'} />
          <Text className="text-muted text-xs">{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/post/${post._id}`)}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name="chatbubble-outline" size={17} color="#6B7280" />
          <Text className="text-muted text-xs">{post.commentCount ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
