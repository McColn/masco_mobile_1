// components/ui/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const heights: Record<Size, number> = { sm: 36, md: 48, lg: 56 };
  const fontSizes: Record<Size, number> = {
    sm: Typography.sm,
    md: Typography.base,
    lg: Typography.md,
  };

  const isPrimary = variant === 'primary';
  const isTeal = variant === 'teal';

  if (isPrimary || isTeal) {
    const gradientColors: [string, string] = isPrimary
      ? [Colors.gold, '#b8790d']
      : [Colors.teal, Colors.tealDark];

    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.82}
        style={[fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            { height: heights[size], opacity: disabled ? 0.5 : 1 },
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          {loading ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                styles.textDark,
                { fontSize: fontSizes[size] },
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    secondary: {
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: Colors.danger },
  };

  const variantTextStyles: Record<string, TextStyle> = {
    secondary: { color: Colors.textPrimary },
    ghost: { color: Colors.textSecondary },
    danger: { color: '#fff' },
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        variantStyles[variant],
        { height: heights[size], opacity: disabled ? 0.5 : 1 },
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            variantTextStyles[variant],
            { fontSize: fontSizes[size] },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  text: {
    fontWeight: Typography.semibold,
    letterSpacing: 0.3,
  },
  textDark: {
    color: Colors.textInverse,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
});

export default Button;
