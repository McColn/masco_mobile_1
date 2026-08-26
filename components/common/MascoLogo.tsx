// components/common/MascoLogo.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type Variant = 'dark' | 'light';
interface Props {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm:  { logo: 52,  name: 16, tagline: 9  },
  md:  { logo: 80,  name: 20, tagline: 11 },
  lg:  { logo: 110, name: 24, tagline: 13 },
  xl:  { logo: 140, name: 28, tagline: 15 },
};

// icon.png is used directly — already exists in assets/
const LOGO = require('@/assets/icon.png');

export function MascoLogo({ variant = 'dark', size = 'md' }: Props) {
  const dim = SIZES[size];
  const isDark = variant === 'dark';

  return (
    <View style={styles.container}>
      {/* Logo image with optional glow ring */}
      <View style={[
        styles.ring,
        {
          width:  dim.logo + 16,
          height: dim.logo + 16,
          borderRadius: (dim.logo + 16) / 2,
          borderColor: isDark ? 'rgba(61,214,200,0.35)' : 'rgba(13,27,46,0.15)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,27,46,0.05)',
        },
      ]}>
        <Image
          source={LOGO}
          style={{
            width:  dim.logo,
            height: dim.logo,
            borderRadius: dim.logo / 2,
          }}
          resizeMode="cover"
        />
      </View>

      {/* App name */}
      <Text style={[
        styles.name,
        { fontSize: dim.name, color: isDark ? '#fff' : '#0d1b2e' },
      ]}>
        MASCO <Text style={{ color: '#3dd6c8' }}>Finance</Text>
      </Text>

      {/* Tagline — only on large sizes */}
      {(size === 'lg' || size === 'xl') && (
        <Text style={[
          styles.tagline,
          { fontSize: dim.tagline, color: isDark ? 'rgba(255,255,255,0.5)' : '#888' },
        ]}>
          Microfinance Management
        </Text>
      )}
    </View>
  );
}

export default MascoLogo;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 2,
  },
  name: {
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tagline: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
