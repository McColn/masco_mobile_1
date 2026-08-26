// Loan Repayment Receipt (STAKABADHI YA FEDHA)
// Matches web image 2: MASCO FINANCE letterhead, receipt no on right,
// customer info, amount, payment month, remaining balance, officer,
// signature line, today's date. PRINT button generates HTML → PDF via
// expo-print (which can print, save-to-file, and share on both iOS and Android).
//
// If expo-print is not installed, run:  npx expo install expo-print expo-sharing
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService } from '@/lib/services';

const NAVY = '#1e40af';
const RED  = '#b91c1c';
const OK   = '#0ea5e9';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  return Math.round(n).toLocaleString('en-US');
}

// Try to load expo-print; degrade gracefully to Alert if unavailable
async function tryPrint(html: string, filename: string): Promise<void> {
  try {
    // Dynamically import so a missing package doesn't crash the whole screen
    const Print = await import('expo-print');
    await Print.printAsync({ html });
  } catch (err: any) {
    // Fallback: try to generate a file + share
    try {
      const Print   = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });
      } else {
        Alert.alert('Receipt saved', `PDF was saved but sharing isn't available on this device.\nPath: ${uri}`);
      }
    } catch (err2: any) {
      Alert.alert(
        'Printing unavailable',
        'The expo-print module is not installed. Run:\n\nnpx expo install expo-print expo-sharing\n\nThen rebuild the app.'
      );
    }
  }
}

// HTML receipt for print/PDF — matches the web receipt layout exactly
function buildReceiptHTML(r: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${r.receipt_number}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #222; }
    .frame { max-width: 700px; margin: 0 auto; padding: 24px 32px 0; border: 1px solid #d1d5db; }
    .head { display: flex; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 2px solid #b91c1c; }
    .logo { font-size: 28px; font-weight: 800; color: #1e40af; letter-spacing: 1px; }
    .co   { flex: 1; }
    .co h1 { margin: 0; font-size: 20px; color: #1e40af; font-weight: 800; letter-spacing: 0.5px; }
    .co p  { margin: 2px 0; font-size: 12px; color: #444; }
    .title-row { display: flex; justify-content: space-between; align-items: center; margin: 22px 0 14px; }
    .title { font-size: 18px; font-weight: 800; text-decoration: underline; text-align: center; flex: 1; }
    .receipt-no { font-weight: 700; font-size: 15px; color: #111; }
    .line { margin: 12px 0; font-size: 14px; color: #333; line-height: 1.9; }
    .lbl { color: #4b5563; }
    .val { font-weight: 700; text-decoration: underline; color: #111; }
    .val-red { color: #b91c1c; }
    .footer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-bottom: 32px; }
    .footer-row div { font-size: 13px; }
    .sig-line { display: inline-block; border-bottom: 1px solid #111; width: 160px; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="head">
      <div class="logo">masco</div>
      <div class="co">
        <h1>MASCO FINANCE CO. LTD</h1>
        <p>P.O.BOX 30474—KIBAHA | TANZANIA</p>
        <p>Mobile: +255 718 544 515; Email: mascofinance@gmail.com</p>
      </div>
    </div>

    <div class="title-row">
      <div style="width: 100px"></div>
      <div class="title">STAKABADHI YA FEDHA</div>
      <div class="receipt-no">${r.receipt_number}</div>
    </div>

    <div class="line">
      Jina la Mteja: <span class="val">${r.client_fullname}</span>
      &nbsp;&nbsp;&nbsp;&nbsp;Tawi la: <span class="val">${r.branch_name}</span>
    </div>

    <div class="line">
      Nimepokea Tsh <span class="val">${fmtN(r.amount)} /=</span>
      &nbsp;&nbsp;Kwa malipo ya <span class="val">marejesho ya mkopo wa Mwezi ${r.payment_month}</span>
    </div>

    <div class="line">
      Deni la mkopo lililobakia ni Tsh <span class="val val-red">${fmtN(r.balance_after)} /=</span>
    </div>

    <div class="footer-row">
      <div>Jina la muhudumu: <b>${r.officer_name || '—'}</b></div>
      <div>Saini: <span class="sig-line"></span></div>
      <div>Tarehe: <b>${r.printed_date}</b></div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repaymentId = Number(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receipt-detail', repaymentId],
    queryFn:  () => LoanService.receiptDetail(repaymentId),
    enabled:  !!repaymentId,
  });

  const handlePrint = async () => {
    if (!data) return;
    Toast.show({ type: 'info', text1: 'Preparing receipt…', visibilityTime: 1500 });
    const html = buildReceiptHTML(data);
    await tryPrint(html, `Receipt-${data.receipt_number}.pdf`);
  };

  if (isLoading || !data) {
    return (
      <ScreenLayout title="Receipt" showBack>
        {isError ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={{ color: Colors.error, fontWeight: '600', marginTop: 8 }}>Failed to load</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
              {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? 'Please try again.'}
            </Text>
          </View>
        ) : (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        )}
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Receipt" showBack>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Receipt card — mirrors web layout on screen so user can review before printing */}
        <View style={s.frame}>
          {/* Letterhead */}
          <View style={s.head}>
            <Text style={s.logo}>masco</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.coName}>MASCO FINANCE CO. LTD</Text>
              <Text style={s.coInfo}>P.O.BOX 30474—KIBAHA | TANZANIA</Text>
              <Text style={s.coInfo}>Mobile: +255 718 544 515</Text>
              <Text style={s.coInfo}>Email: mascofinance@gmail.com</Text>
            </View>
          </View>
          <View style={s.headLine} />

          {/* Title row */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }} />
            <Text style={s.title}>STAKABADHI YA FEDHA</Text>
            <Text style={s.receiptNo}>{data.receipt_number}</Text>
          </View>

          {/* Body lines */}
          <View style={{ padding: Spacing.base }}>
            <Text style={s.line}>
              Jina la Mteja: <Text style={s.val}>{data.client_fullname}</Text>
            </Text>
            <View style={{ height: 4 }} />
            <Text style={s.line}>
              Tawi la: <Text style={s.val}>{data.branch_name}</Text>
            </Text>
            <View style={{ height: 14 }} />
            <Text style={s.line}>
              Nimepokea Tsh <Text style={s.val}>{fmtN(data.amount)} /=</Text>
            </Text>
            <View style={{ height: 4 }} />
            <Text style={s.line}>
              Kwa malipo ya <Text style={s.val}>marejesho ya mkopo wa Mwezi {data.payment_month}</Text>
            </Text>
            <View style={{ height: 14 }} />
            <Text style={s.line}>
              Deni la mkopo lililobakia ni Tsh <Text style={[s.val, { color: RED }]}>{fmtN(data.balance_after)} /=</Text>
            </Text>

            {/* Footer info */}
            <View style={s.footerBlock}>
              <View style={s.footerCell}>
                <Text style={s.footerLbl}>Jina la muhudumu:</Text>
                <Text style={s.footerVal}>{data.officer_name || '—'}</Text>
              </View>
              <View style={s.footerCell}>
                <Text style={s.footerLbl}>Saini:</Text>
                <View style={s.sigLine} />
              </View>
              <View style={s.footerCell}>
                <Text style={s.footerLbl}>Tarehe:</Text>
                <Text style={s.footerVal}>{data.printed_date}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.printBtn} onPress={handlePrint}>
            <Text style={s.printBtnText}>🖨  PRINT / SAVE PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  frame: {
    backgroundColor: '#fff', margin: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    ...Shadow.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: 12 },
  logo: { fontSize: 22, fontWeight: '800', color: NAVY, letterSpacing: 1 },
  coName: { fontSize: 15, fontWeight: '800', color: NAVY, letterSpacing: 0.3 },
  coInfo: { fontSize: 10, color: '#4b5563', marginTop: 1 },
  headLine: { height: 2, backgroundColor: RED, marginHorizontal: Spacing.base },

  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginTop: 16, marginBottom: 4 },
  title: { flex: 2, fontSize: 15, fontWeight: '800', color: Colors.text, textAlign: 'center', textDecorationLine: 'underline' },
  receiptNo: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'right' },

  line: { fontSize: 13, color: '#333', lineHeight: 22 },
  val: { fontWeight: '700', color: Colors.text, textDecorationLine: 'underline' },

  footerBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  footerCell: { minWidth: 90 },
  footerLbl: { fontSize: 10, color: '#4b5563' },
  footerVal: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 2 },
  sigLine: { width: 120, borderBottomWidth: 1, borderBottomColor: '#111', marginTop: 12 },

  actionsRow: { flexDirection: 'row', gap: 12, marginHorizontal: Spacing.base, marginTop: Spacing.sm },
  backBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  printBtn: {
    flex: 2, backgroundColor: NAVY, paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, ...Shadow.sm,
  },
  printBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.4 },
});
