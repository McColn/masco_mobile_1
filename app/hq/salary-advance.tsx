import React from 'react';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { ComingSoon } from '@/components/common/ComingSoon';

export default function Screen() {
  return (
    <ScreenLayout title="Staff Deductions" subtitle="HQ" showBack>
      <ComingSoon title="Staff Deductions" />
    </ScreenLayout>
  );
}
