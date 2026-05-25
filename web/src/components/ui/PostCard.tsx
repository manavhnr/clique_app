'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { Post, Event, User } from '@/types';
import { timeAgo, getImageUrl, formatDate, formatPrice } from '@/lib/utils';
import api from '@/lib/api';

interface Props {
  post: Post;
  liked?: boolean;
}

export default function PostCard({ post, liked: initialLiked = false }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [pending, setPending] = useState(false);

  const author = typeof post.userId === 'object' ? (post.userId as User) : null;
  const linkedEvent = typeof post.linkedEventId === 'object' ? (post.linkedEventId as Event) : null;
  const media = post.mediaUrls ?? [];

  const handleLike = async () => {
    if (pending) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    setPending(true);
    try {
      if (wasLiked) await api.delete(`/posts/${post._id}/like`);
      else await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      {/* Author */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
          {author?.profileImage ? (
            <img src={getImageUrl(author.profileImage)} alt={author.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary-light">
              {author?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium text-sm truncate">{author?.name ?? 'Unknown'}</span>
            {author?.isVerifiedHost && <ShieldCheck size={13} className="text-primary-light shrink-0" />}
          </div>
          <p className="text-xs text-muted">@{author?.username} · {timeAgo(post.createdAt)}</p>
        </div>
      </div>

      {/* Text */}
      {post.text && (
        <p className="px-4 pb-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{post.text}</p>
      )}

      {/* Media grid */}
      {media.length > 0 && (
        <div
          className={`grid gap-0.5 ${
            media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {media.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className={`relative overflow-hidden bg-dark-border ${
                media.length === 1 ? 'h-72' : 'h-44'
              }`}
            >
              <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" />
              {i === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{media.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Linked event */}
      {linkedEvent && (
        <div className="mx-4 my-3">
          <Link href={`/events/${linkedEvent._id}`}>
            <div className="border border-dark-border rounded-xl p-3 hover:border-primary/30 transition-colors flex gap-3 items-center bg-dark">
              {linkedEvent.images?.[0] && (
                <img
                  src={getImageUrl(linkedEvent.images[0])}
                  alt={linkedEvent.title}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold line-clamp-1">{linkedEvent.title}</p>
                <p className="text-muted text-xs mt-0.5">
                  {formatDate(linkedEvent.date)} · {formatPrice(linkedEvent.price)}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-dark-border">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-red-400' : 'text-muted hover:text-red-400'
          }`}
        >
          <Heart size={16} className={liked ? 'fill-red-400' : ''} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors">
          <MessageCircle size={16} />
          {(post.commentCount ?? 0) > 0 && <span>{post.commentCount}</span>}
        </button>
      </div>
    </div>
  );
}
