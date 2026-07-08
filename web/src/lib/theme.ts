/**
 * Canonical visual vocabulary shared across screens.
 * There is exactly one category→color map; do not fork per page.
 */

export const COLORS = {
  ink:   '#0B0907',
  paper: '#F2EDE2',
  cream: '#E8E1D2',
  lime:  '#C9F36E',
  hot:   '#FF3D6E',
  gold:  '#E8C46E',
  sky:   '#7DB4FF',
  dim:   '#8A8173',
  line:  '#1C1814',
  line2: '#2A2520',
  card:  '#14110E',
} as const;

export const CAT_COLORS: Record<string, string> = {
  house_party: COLORS.lime,
  warehouse:   COLORS.hot,
  club:        COLORS.hot,
  college:     COLORS.gold,
  supper_club: COLORS.lime,
  listening:   COLORS.sky,
  private:     COLORS.gold,
  concert:     COLORS.sky,
  other:       COLORS.cream,
};

export function catColor(category: string | undefined): string {
  return CAT_COLORS[category ?? 'other'] ?? COLORS.cream;
}

export const VIBE_TAGS = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];

export const MUSIC_TAGS = ['Live DJ', 'Live Band', 'Playlist', 'Open Mic', 'Acoustic'];

export const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa', 'Chandigarh', 'Kochi', 'Indore', 'Lucknow', 'Surat', 'Nagpur', 'Coimbatore', 'Vizag', 'Bhopal', 'Vadodara'];
