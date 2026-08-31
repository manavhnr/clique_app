import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

// ─── UPI Payment Modal ────────────────────────────────────────────────────────

function UPIPaymentModal({
  visible,
  onClose,
  amount,
  bookingId,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  amount: number;
  bookingId: string;
  onSuccess: () => void;
}) {
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to upload proof.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setProofUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!utr.trim() && !upiId.trim()) { Alert.alert('Required', 'Enter your UTR number or the UPI ID you paid from.'); return; }
    setSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (proofUri) {
        setUploading(true);
        const form = new FormData();
        form.append('proof', { uri: proofUri, name: 'proof.jpg', type: 'image/jpeg' } as any);
        const { data: uploadRes } = await api.post('/payments/upload-proof', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        proofUrl = uploadRes.data.url;
        setUploading(false);
      }
      await api.post('/payments/upi-submit', {
        bookingId,
        utrNumber: utr.trim() || undefined,
        upiId: upiId.trim() || undefined,
        transactionProofUrl: proofUrl,
      });
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: '#0F172A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>Pay via UPI</Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
            Scan the QR with any UPI app and pay <Text style={{ color: '#F59E0B', fontWeight: '700' }}>₹{amount}</Text>
          </Text>

          {/* QR Code */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Image
              source={require('@/assets/upi-qr.png')}
              style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: '#fff' }}
              resizeMode="contain"
            />
            <Text style={{ color: '#64748B', fontSize: 11, marginTop: 8 }}>Pay ₹{amount} to Clique</Text>
          </View>

          {/* UTR or UPI ID — at least one required */}
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>UTR NUMBER</Text>
          <TextInput
            style={{
              backgroundColor: '#1E293B', color: '#fff', borderRadius: 10,
              padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 14,
            }}
            placeholder="Enter 12-digit UTR number"
            placeholderTextColor="#475569"
            value={utr}
            onChangeText={setUtr}
            keyboardType="default"
            autoCapitalize="characters"
          />

          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>OR UPI ID YOU PAID FROM</Text>
          <TextInput
            style={{
              backgroundColor: '#1E293B', color: '#fff', borderRadius: 10,
              padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 14,
            }}
            placeholder="e.g. yourname@upi"
            placeholderTextColor="#475569"
            value={upiId}
            onChangeText={setUpiId}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={{ color: '#475569', fontSize: 11, marginBottom: 14, marginTop: -8 }}>Enter either your UTR number or the UPI ID you paid from.</Text>

          {/* Proof upload */}
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>TRANSACTION SCREENSHOT</Text>
          <TouchableOpacity
            onPress={pickProof}
            style={{
              backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1,
              borderColor: proofUri ? '#2563EB' : '#334155', borderStyle: 'dashed',
              padding: 14, alignItems: 'center', marginBottom: 20, flexDirection: 'row', gap: 10,
            }}
          >
            {proofUri ? (
              <>
                <Image source={{ uri: proofUri }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                <Text style={{ color: '#60A5FA', fontSize: 13, flex: 1 }}>Screenshot selected — tap to change</Text>
              </>
            ) : (
              <>
                <Ionicons name="image-outline" size={20} color="#475569" />
                <Text style={{ color: '#64748B', fontSize: 13 }}>Upload payment screenshot (optional)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: submitting ? '#1D4ED8' : '#2563EB',
              borderRadius: 14, paddingVertical: 16, alignItems: 'center',
            }}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {uploading ? 'Uploading…' : 'Submit Payment Proof'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [upiModal, setUpiModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [coverHeight, setCoverHeight] = useState<number>(width * 1.25);
  const router = useRouter();
  const { user } = useAuth();

  const refreshEvent = () =>
    api.get(`/events/${id}`)
      .then(({ data }) => {
        const ev = data.data?.event;
        setEvent(ev);
        setSaved(ev?.isSaved ?? false);
        if (ev?.images?.[0]) {
          Image.getSize(ev.images[0], (imgW, imgH) => {
            if (imgW > 0) setCoverHeight(Math.round(width * imgH / imgW));
          });
        }
      })
      .catch(() => {});

  useEffect(() => {
    refreshEvent().finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!event) return;
    setBooking(true);
    try {
      const { data } = await api.post('/bookings', { eventId: event._id });
      const createdBooking = data.data?.booking;

      if (createdBooking?.amount > 0 && createdBooking?.status === 'payment_pending') {
        // Open UPI payment modal for paid events
        setUpiModal({ bookingId: createdBooking._id, amount: createdBooking.amount });
      } else {
        // Free event — pass is already generated
        Alert.alert('Booked!', 'Your pass is confirmed.', [
          { text: 'View Pass', onPress: () => router.push('/(main)/passes') },
          { text: 'OK' },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Booking failed');
    } finally { setBooking(false); }
  };

  const handleRequest = async () => {
    if (!event) return;
    try {
      await api.post('/requests', { eventId: event._id });
      Alert.alert('Requested', 'Your access request has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Request failed');
    }
  };

  const handleSave = async () => {
    if (!event) return;
    try {
      if (saved) {
        await api.delete(`/events/${event._id}/save`);
      } else {
        await api.post(`/events/${event._id}/save`);
      }
      setSaved(s => !s);
    } catch { }
  };

  const handleUPISuccess = () => {
    setUpiModal(null);
    Alert.alert(
      'Proof Submitted!',
      'Your payment proof has been submitted. You\'ll be notified once it\'s verified.',
      [{ text: 'OK', onPress: () => refreshEvent() }]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="calendar-outline" size={48} color="#374151" />
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#2563EB', fontSize: 14 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spotsLeft = (event.capacity ?? 0) - (event.bookedCount ?? 0);
  const isFull = spotsLeft <= 0;
  const isOwnEvent = event.hostId?._id === user?._id;
  const needsApproval = event.privacy === 'private' && event.approvalRequired;
  const isBooked = event.userBooking?.status === 'confirmed';
  const isPaymentPending = event.userBooking?.status === 'payment_pending';
  const isUtrSubmitted = event.userBooking?.status === 'utr_submitted';

  // Effective price: use active tier + user gender for split pricing
  const activeTier = event.activeTier;
  const effectivePrice = (() => {
    if (!activeTier) return event.price ?? 0;
    if (event.pricingMode === 'split') {
      if (user?.gender === 'male') return activeTier.malePrice;
      if (user?.gender === 'female') return activeTier.femalePrice;
    }
    return activeTier.commonPrice;
  })();

  const privacyLabel = event.privacy === 'secret' ? 'Secret' : event.privacy === 'private' ? 'Private' : 'Public';
  const privacyColor = event.privacy === 'public' ? '#14532d' : '#422006';
  const privacyText = event.privacy === 'public' ? '#4ade80' : '#fb923c';

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <StatusBar barStyle="light-content" />

      {upiModal && (
        <UPIPaymentModal
          visible
          onClose={() => setUpiModal(null)}
          amount={upiModal.amount}
          bookingId={upiModal.bookingId}
          onSuccess={handleUPISuccess}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover image — sized to the image's natural aspect ratio so nothing is cropped */}
        <View style={{ width, height: coverHeight, backgroundColor: '#111827' }}>
          {event.images?.[0]
            ? <Image source={{ uri: event.images[0] }} style={{ width, height: coverHeight }} resizeMode="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar" size={56} color="#374151" />
              </View>
          }
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: 16, paddingTop: 52 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? '#F59E0B' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', flex: 1, lineHeight: 28, marginRight: 12 }}>
              {event.title}
            </Text>
            <View style={{ backgroundColor: privacyColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 }}>
              <Text style={{ color: privacyText, fontSize: 11, fontWeight: '700' }}>{privacyLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push(`/user/${event.hostId?._id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
            activeOpacity={0.7}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', overflow: 'hidden', marginRight: 10 }}>
              {event.hostId?.profileImage
                ? <Image source={{ uri: event.hostId.profileImage }} style={{ width: 32, height: 32 }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={15} color="#6B7280" />
                  </View>
              }
            </View>
            <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '600' }}>{event.hostId?.name ?? 'Host'}</Text>
            {event.hostId?.isVerifiedHost && (
              <Ionicons name="checkmark-circle" size={14} color="#2563EB" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {dateStr && <InfoPill icon="calendar-outline" label={dateStr} />}
            {(event.startTime || event.endTime) && (
              <InfoPill icon="time-outline" label={[event.startTime, event.endTime].filter(Boolean).join(' – ')} />
            )}
            {event.locationName && <InfoPill icon="location-outline" label={event.locationName} />}
            <InfoPill
              icon="people-outline"
              label={isFull ? 'Sold out' : `${spotsLeft} spots left`}
              accent={isFull ? '#ef4444' : undefined}
            />
            <InfoPill
              icon="cash-outline"
              label={effectivePrice > 0 ? `₹${effectivePrice}` : 'Free Entry'}
              accent={effectivePrice > 0 ? '#F59E0B' : '#22c55e'}
            />
          </View>

          {event.description ? (
            <Section title="About">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.description}</Text>
            </Section>
          ) : null}

          {event.vibeTags?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {event.vibeTags.map((tag: string) => (
                <View key={tag} style={{ backgroundColor: '#1e3a5f', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '500' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {event.groupPricing?.length > 0 && (
            <Section title="Group Offers">
              {event.groupPricing.map((g: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1F2937' }}>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{g.label || `Group of ${g.size}`}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{g.size} people</Text>
                  </View>
                  <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '700' }}>₹{g.price}</Text>
                </View>
              ))}
            </Section>
          )}

          {event.rules ? (
            <Section title="Rules">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.rules}</Text>
            </Section>
          ) : null}

          {event.refundPolicy ? (
            <Section title="Refund Policy">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.refundPolicy}</Text>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      {/* CTA */}
      {!isOwnEvent && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#0A0A0F',
          borderTopWidth: 1, borderTopColor: '#1F2937',
          padding: 16, paddingBottom: 32,
        }}>
          {isBooked ? (
            <View style={{ backgroundColor: '#111827', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 15 }}>You're going!</Text>
            </View>
          ) : isUtrSubmitted ? (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: '#1C1600', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600', flex: 1 }}>Payment proof under review</Text>
              </View>
              <TouchableOpacity
                onPress={() => setUpiModal({ bookingId: event.userBooking._id, amount: event.userBooking.amount })}
                style={{ backgroundColor: '#1F2937', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#94A3B8', fontWeight: '600', fontSize: 14 }}>Resubmit / Update Proof</Text>
              </TouchableOpacity>
            </View>
          ) : isPaymentPending ? (
            <TouchableOpacity
              onPress={() => setUpiModal({ bookingId: event.userBooking._id, amount: event.userBooking.amount })}
              style={{ backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Complete Payment · ₹{event.userBooking.amount}</Text>
            </TouchableOpacity>
          ) : needsApproval && !event.userBooking?.status ? (
            <TouchableOpacity
              onPress={handleRequest}
              style={{ backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Request Access</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBook}
              disabled={isFull || booking}
              style={{
                backgroundColor: isFull ? '#1F2937' : booking ? '#1D4ED8' : '#2563EB',
                borderRadius: 14, paddingVertical: 16, alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              {booking
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: isFull ? '#6B7280' : '#fff', fontWeight: '700', fontSize: 15 }}>
                    {isFull ? 'Sold Out' : effectivePrice > 0 ? `Book · ₹${effectivePrice}` : 'Get Free Pass'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function InfoPill({ icon, label, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: '#1F2937' }}>
      <Ionicons name={icon} size={13} color={accent ?? '#6B7280'} />
      <Text style={{ color: accent ?? '#D1D5DB', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}
