import React from 'react';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { queryClient } from '@/lib/queryClient';
import { AppLoadingScreen } from '@/components/common/AppLoadingScreen';
import { toastConfig } from '@/lib/toastConfig';
import { useAuthStore } from '@/store/authStore';
import { authEventEmitter } from '@/lib/api';
import { DrawerProvider } from '@/lib/drawerContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { restoreSession, logout } = useAuthStore();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    restoreSession().finally(() => {
      SplashScreen.hideAsync();
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    const unsub = authEventEmitter.on('logout', () => logout());
    return () => unsub();
  }, [logout]);

  if (!isReady) {
    return <AppLoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DrawerProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="loans/[id]"      options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="loans/new"        options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="loans/edit/[id]"  options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/payment-receipts" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/bank-charge-new"   options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="receipts/[id]"    options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="clients/[id]"    options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="clients/new"      options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="expenses/new"     options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="reports/index"    options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="reports/balance-sheet" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="reports/trial-balance" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="salaries/index"   options={{ animation: 'slide_from_right' }} />
              {/* HQ screens */}
              <Stack.Screen name="hq/staff"              options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/office"             options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/transfer-client"    options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/salary"             options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/salary-advance"     options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/nyongeza"           options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/payroll"            options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/office-transactions" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/loans-issued"           options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/loans-owed"             options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/expired-loans"          options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/financial-statement"    options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/hq-financial-statement" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/expenses-statement"     options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/salary-slip"            options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/customer-report"             options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/detail/loans"                options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/detail/expenses"             options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/detail/repayments"           options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="hq/reports/detail/transactions"         options={{ animation: 'slide_from_right' }} />
              {/* Branch screens */}
              <Stack.Screen name="branch/clients"              options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/loan-payment"         options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/office-transaction"   options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/receipt"              options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/customer-loans"       options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/customer-statement"   options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/plan-calculator"      options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/loan-calculator"      options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/transaction-statement"   options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/loan-collection"         options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/loans-issued"            options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/loans-owed"              options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/expired-loans"           options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/repayment-schedule"      options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/financial-statement"     options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/expenses-statement"      options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/edit-repayment"           options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/monthly-repayment"       options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/bank-charges"            options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="branch/reports/completed-customers"     options={{ animation: 'slide_from_right' }} />
            </Stack>
            <Toast config={toastConfig} />
          </DrawerProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
