import { Tabs } from 'expo-router';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#7C3AED';
const MUTED = '#6B7280';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabIconProps = {
  focused: boolean;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

function TabIcon({ focused, label, icon, activeIcon }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6, width: 60 }}>
      <Ionicons
        name={focused ? activeIcon : icon}
        size={24}
        color={focused ? PRIMARY : MUTED}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          marginTop: 3,
          color: focused ? PRIMARY : MUTED,
          fontWeight: focused ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { user } = useAuth();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6, width: 60 }}>
      {user?.profileImage ? (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2,
            borderColor: focused ? PRIMARY : 'transparent',
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: user.profileImage }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      ) : (
        <Ionicons
          name={focused ? 'person' : 'person-outline'}
          size={24}
          color={focused ? PRIMARY : MUTED}
        />
      )}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          marginTop: 3,
          color: focused ? PRIMARY : MUTED,
          fontWeight: focused ? '600' : '400',
        }}
      >
        Profile
      </Text>
    </View>
  );
}

export default function MainLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#13131A',
          borderTopColor: '#1E1E2E',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Home" icon="home-outline" activeIcon="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Events" icon="compass-outline" activeIcon="compass" />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: PRIMARY,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                opacity: focused ? 1 : 0.9,
                shadowColor: PRIMARY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="passes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Passes" icon="ticket-outline" activeIcon="ticket" />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Admin" icon="shield-outline" activeIcon="shield-checkmark" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}
