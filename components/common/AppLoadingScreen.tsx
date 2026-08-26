// components/common/AppLoadingScreen.tsx
// Shown while the app checks auth tokens on startup
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MascoLogo } from './MascoLogo';

const { height } = Dimensions.get('window');

export function AppLoadingScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dot1      = useRef(new Animated.Value(0.3)).current;
  const dot2      = useRef(new Animated.Value(0.3)).current;
  const dot3      = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade + scale in logo
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // Bouncing dots animation
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    pulse(dot1, 0).start();
    pulse(dot2, 200).start();
    pulse(dot3, 400).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background gradient effect using nested Views */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      {/* Logo */}
      <Animated.View style={[
        styles.logoWrapper,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}>
        <MascoLogo variant="dark" size="xl" />
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: fadeAnim }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dot, transform: [{ scale: dot }] }]}
          />
        ))}
      </Animated.View>

      {/* Loading text */}
      <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
        Loading...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: height * 0.5,
    backgroundColor: '#0d1b2e',
  },
  bgBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: height * 0.5,
    backgroundColor: '#0a1520',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(61,214,200,0.06)',
  },
  circleTopRight: {
    width: 280, height: 280,
    top: -60, right: -80,
  },
  circleBottomLeft: {
    width: 200, height: 200,
    bottom: 80, left: -60,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 60,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#3dd6c8',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
