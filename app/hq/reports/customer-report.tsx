import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TextInput, TouchableOpacity, Modal, Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatTZS } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';

const { width: W, height: H } = Dimensions.get('window');
const GOLD   = '#c8a96e';
const TEAL   = '#0da9a9';
const NAVY   = '#0d1b2e';
const PURPLE_BG = '#f3e6f5';  // outstanding balance highlight colour from screenshot

// ── Repayment Schedule Modal ──────────────────────────────────────────────
function ScheduleModal({ loanId, visible, onClose }: { loanId: number; visible: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['loan-schedule', loanId],
    queryFn: () => api.get(`/loans/${loanId}/schedule/`).then(r => r.data),
    enabled: visible && !!loanId,
  });

  const rows: any[]  = data?.schedule ?? [];
  const totals: any  = data?.totals ?? {};
  const sched = rows.filter((r: any) => !r.extra);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.root}>
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={onClose} />
        <View style={ms.sheet}>

          {/* Header */}
          <View style={ms.header}>
            <View>
              <Text style={ms.headerTitle}>LOAN REPAYMENT SCHEDULES</Text>
              {data && (
                <>
                  <Text style={ms.headerSub}>Customer: <Text style={ms.headerBold}>{data.client_name}</Text></Text>
                  <Text style={ms.headerSub}>
                    NIDA: <Text style={ms.headerBold}>{data.nida}</Text>
                    {'  '}Branch: <Text style={ms.headerBold}>{data.branch}</Text>
                    {data.work_station ? `  Work Station: ${data.work_station}` : ''}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ margin: 40 }} />}

          {data && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Column headers */}
                  <View style={[ms.row, ms.thead]}>
                    {['Installment Month','Principal Repayment','Interest Repayment','Penalt Repayment','Total','Paid','Out'].map(h => (
                      <Text key={h} style={[ms.cell, ms.theadText,
                        h === 'Installment Month' ? { width: 110 } :
                        h === 'Out'               ? { width: 80  } : { width: 105, textAlign: 'right' }]}>
                        {h}
                      </Text>
                    ))}
                  </View>

                  {/* Schedule rows */}
                  {sched.map((row: any, i: number) => (
                    <View key={i} style={[ms.row, i % 2 === 1 && ms.rowAlt]}>
                      <Text style={[ms.cell, { width: 110, color: Colors.textSecondary }]}>{row.month_label}</Text>
                      <Text style={[ms.cell, { width: 105, textAlign: 'right' }]}>{fmtN(row.principal)}</Text>
                      <Text style={[ms.cell, { width: 105, textAlign: 'right' }]}>{fmtN(row.interest)}</Text>
                      <Text style={[ms.cell, { width: 105, textAlign: 'right' }]}>{fmtN(row.penalty ?? 0)}</Text>
                      <Text style={[ms.cell, { width: 105, textAlign: 'right' }]}>{fmtN(row.total)}</Text>
                      <Text style={[ms.cell, { width: 105, textAlign: 'right', color: Number(row.paid) > 0 ? Colors.success : Colors.textMuted }]}>
                        {Number(row.paid) > 0 ? fmtN(row.paid) : '0'}
                      </Text>
                      <Text style={[ms.cell, { width: 80, textAlign: 'right', color: Number(row.outstanding) > 0 ? Colors.error : Colors.textMuted }]}>
                        {Number(row.outstanding) > 0 ? fmtN(row.outstanding) : ''}
                      </Text>
                    </View>
                  ))}

                  {/* Footer totals */}
                  <View style={[ms.row, ms.tfoot]}>
                    <Text style={[ms.cell, ms.tfootText, { width: 110 }]}>TOTAL</Text>
                    <Text style={[ms.cell, ms.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.principal)}</Text>
                    <Text style={[ms.cell, ms.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.interest)}</Text>
                    <Text style={[ms.cell, ms.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.penalty ?? 0)}</Text>
                    <Text style={[ms.cell, ms.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.total)}</Text>
                    <Text style={[ms.cell, ms.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.paid)}</Text>
                    <Text style={[ms.cell, { width: 80 }]}> </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Re Schedule action — matches web screenshot's orange button */}
              <View style={ms.actionsRow}>
                <TouchableOpacity
                  style={ms.reScheduleBtn}
                  onPress={() => {
                    onClose();
                    router.push(`/loans/edit/${loanId}` as any);
                  }}
                >
                  <Text style={ms.reScheduleBtnText}>← Re Schedule</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Customer Loans Table Modal ─────────────────────────────────────────────
function ClientLoansModal({ client, visible, onClose }: { client: any; visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [schedLoanId, setSchedLoanId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['client-loans-detail', client?.id],
    queryFn: () => api.get(`/clients/${client.id}/loans/`).then(r =>
      Array.isArray(r.data) ? r.data : (r.data.results ?? [])
    ),
    enabled: visible && !!client?.id,
  });

  const { mutate: toggleApprove } = useMutation({
    mutationFn: (loanId: number) => api.post(`/loans/${loanId}/toggle-approve/`).then(r => r.data),
    onSuccess: (res: any) => {
      Toast.show({ type: 'success', text1: res.message });
      refetch();
      qc.invalidateQueries({ queryKey: ['customer-report'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.detail ?? 'Failed' }),
  });

  const { mutate: deleteLoan, isPending: isDeleting } = useMutation({
    mutationFn: (loanId: number) => api.post(`/loans/${loanId}/delete/`).then(r => r.data),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Loan deleted', text2: 'Branch balance restored.' });
      setDeleteConfirm(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['customer-report'] });
    },
    onError: (e: any) => {
      setDeleteConfirm(null);
      Toast.show({
        type: 'error',
        text1: 'Delete failed',
        text2: e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Please try again.',
        visibilityTime: 5000,
      });
    },
  });

  const loans: any[] = data ?? [];

  // Totals row
  const totals = loans.reduce((acc, l) => ({
    loan_amount:      acc.loan_amount      + (Number(l.loan_amount) || 0),
    interest_amount:  acc.interest_amount  + (Number(l.total_interest_amount) || 0),
    total_amount:     acc.total_amount     + (Number(l.total_repayment_amount) || 0),
    paid_amount:      acc.paid_amount      + ((Number(l.total_repayment_amount) || 0) - (Number(l.repayment_amount_remaining) || 0)),
    outstanding:      acc.outstanding      + (Number(l.repayment_amount_remaining) || 0),
  }), { loan_amount: 0, interest_amount: 0, total_amount: 0, paid_amount: 0, outstanding: 0 });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={cl.root}>
          <TouchableOpacity style={cl.overlay} activeOpacity={1} onPress={onClose} />
          <View style={cl.sheet}>

            {/* Header */}
            <View style={cl.header}>
              <View>
                <Text style={cl.headerTitle}>CUSTOMER LOAN OUTSTANDING</Text>
                <Text style={cl.headerSub}>
                  Customer Name: <Text style={cl.headerBold}>{client?.name}</Text>
                  {'   '}Check No: <Text style={cl.headerBold}>{client?.checkno || '—'}</Text>
                  {'   '}Branch: <Text style={cl.headerBold}>{client?.branch || '—'}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={cl.closeBtn}>
                <Text style={cl.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ margin: 40 }} />}

            {loans.length > 0 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    {/* Table header */}
                    <View style={[cl.row, cl.thead]}>
                      {['No','Loan Type','Loan ID','Loan amount','Interest Amount','Penalt Amount','Total Amount','Paid Amount','Outstanding Balance','View','Status'].map(h => (
                        <Text key={h} style={[cl.cell, cl.theadText,
                          h === 'No'                  ? { width: 36,  textAlign: 'center' } :
                          h === 'Loan Type'            ? { width: 85  } :
                          h === 'Loan ID'              ? { width: 90  } :
                          h === 'View'                 ? { width: 80, textAlign: 'center' } :
                          h === 'Status'               ? { width: 110, textAlign: 'center' } :
                          h === 'Outstanding Balance'  ? { width: 115 } :
                          { width: 105, textAlign: 'right' }]}>
                          {h}
                        </Text>
                      ))}
                    </View>

                    {/* Loan rows */}
                    {loans.map((loan: any, i: number) => {
                      const outstanding = Number(loan.repayment_amount_remaining) || 0;
                      const paid = (Number(loan.total_repayment_amount) || 0) - outstanding;
                      const isCompleted = outstanding <= 0;

                      return (
                        <View key={loan.id} style={[cl.row, i % 2 === 1 && cl.rowAlt]}>
                          <Text style={[cl.cell, { width: 36, textAlign: 'center', color: Colors.textMuted }]}>{i + 1}</Text>
                          <Text style={[cl.cell, { width: 85 }]}>{loan.loan_type}</Text>
                          <Text style={[cl.cell, { width: 85, color: Colors.primary }]}>
                            {(loan.office || 'loan').toLowerCase().replace(' ','-')}-{loan.id}
                          </Text>
                          <Text style={[cl.cell, { width: 100, textAlign: 'right' }]}>{fmtN(loan.loan_amount)}</Text>
                          <Text style={[cl.cell, { width: 100, textAlign: 'right' }]}>{fmtN(loan.total_interest_amount)}</Text>
                          <Text style={[cl.cell, { width: 100, textAlign: 'right', color: Colors.textMuted }]}>0</Text>
                          <Text style={[cl.cell, { width: 100, textAlign: 'right' }]}>{fmtN(loan.total_repayment_amount)}</Text>
                          <Text style={[cl.cell, { width: 100, textAlign: 'right', color: Colors.success }]}>{fmtN(paid)}</Text>

                          {/* Outstanding Balance — purple bg if has balance */}
                          <View style={[cl.cell, { width: 110, backgroundColor: outstanding > 0 ? PURPLE_BG : 'transparent', borderRadius: 4 }]}>
                            <Text style={[{ textAlign: 'right', fontSize: 11, fontWeight: outstanding > 0 ? '700' : '400', color: outstanding > 0 ? '#8b3a8b' : Colors.textMuted }]}>
                              {outstanding > 0 ? fmtN(outstanding) : '-'}
                            </Text>
                          </View>

                          {/* View schedule button — always visible */}
                          <View style={[cl.cell, { width: 80, alignItems: 'center', justifyContent: 'center' }]}>
                            <TouchableOpacity style={cl.viewBtn} onPress={() => setSchedLoanId(loan.id)}>
                              <Text style={cl.viewBtnText}>👁 View</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Status / Approve / Delete button:
                              - repayment_count === 0  → show Delete button (allowed to delete)
                              - outstanding === 0 AND is_approved === false → show Approve button
                              - is_approved === true                        → show Completed badge
                              - outstanding > 0                             → empty (active loan)  */}
                          <View style={[cl.cell, { width: 110, alignItems: 'center', justifyContent: 'center' }]}>
                            {loan.repayment_count === 0 ? (
                              // No repayments → allow delete (mirrors web view)
                              <TouchableOpacity
                                style={cl.deleteBtn}
                                onPress={() => setDeleteConfirm({
                                  id: loan.id,
                                  label: `${(loan.office || 'loan').toLowerCase().replace(' ', '-')}-${loan.id}`,
                                })}
                              >
                                <Text style={cl.deleteBtnText}>🗑 Delete</Text>
                              </TouchableOpacity>
                            ) : isCompleted && loan.is_approved === false ? (
                              <TouchableOpacity style={cl.approveBtn}
                                onPress={() => toggleApprove(loan.id)}>
                                <Text style={cl.approveBtnText}>✓ Approve</Text>
                              </TouchableOpacity>
                            ) : isCompleted && loan.is_approved === true ? (
                              <View style={cl.completedBadge}>
                                <Text style={cl.completedText}>✓ Completed</Text>
                              </View>
                            ) : isCompleted && !loan.is_approved ? (
                              // is_approved is null/undefined — treat as needs approval
                              <TouchableOpacity style={cl.approveBtn}
                                onPress={() => toggleApprove(loan.id)}>
                                <Text style={cl.approveBtnText}>✓ Approve</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}

                    {/* TOTAL footer row */}
                    <View style={[cl.row, cl.tfoot]}>
                      <Text style={[cl.cell, cl.tfootText, { width: 36 + 85 + 90 }]}>TOTAL</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.loan_amount)}</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.interest_amount)}</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 105, textAlign: 'right' }]}>0</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.total_amount)}</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 105, textAlign: 'right' }]}>{fmtN(totals.paid_amount)}</Text>
                      <Text style={[cl.cell, cl.tfootText, { width: 115, textAlign: 'right' }]}>{fmtN(totals.outstanding)}</Text>
                      <Text style={[cl.cell, { width: 80 + 110 }]}> </Text>
                    </View>
                  </View>
                </ScrollView>
              </ScrollView>
            )}

            {!isLoading && loans.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: Colors.textMuted }}>No loans found for this client.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Schedule modal triggered from View button */}
      {schedLoanId && (
        <ScheduleModal
          loanId={schedLoanId}
          visible={!!schedLoanId}
          onClose={() => setSchedLoanId(null)}
        />
      )}

      {/* ── Delete confirmation modal — mirrors web view's popup ────────── */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteConfirm(null)}
      >
        <View style={cl.delOverlay}>
          <View style={cl.delBox}>
            <View style={cl.delHeader}>
              <Text style={cl.delHeaderText}>⚠ Confirm Delete Loan</Text>
              <TouchableOpacity
                onPress={() => !isDeleting && setDeleteConfirm(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={cl.delBody}>
              <View style={cl.delIconRing}>
                <Text style={{ fontSize: 24 }}>📄</Text>
              </View>
              <Text style={cl.delTitle}>Delete this loan record?</Text>
              <Text style={cl.delLabel}>{deleteConfirm?.label}</Text>
              <Text style={cl.delDesc}>
                This loan has no repayments and will be permanently removed.
              </Text>
              <View style={cl.delNotice}>
                <Text style={cl.delNoticeText}>
                  ℹ This action <Text style={{ fontWeight: '700' }}>cannot be undone</Text>. The loan application will be deleted entirely, and the branch balance will be restored.
                </Text>
              </View>
            </View>
            <View style={cl.delFooter}>
              <TouchableOpacity
                style={[cl.delCancelBtn, isDeleting && { opacity: 0.5 }]}
                onPress={() => !isDeleting && setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                <Text style={cl.delCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cl.delGoBtn, isDeleting && { opacity: 0.6 }]}
                onPress={() => deleteConfirm && deleteLoan(deleteConfirm.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={cl.delGoText}>🗑 Yes, Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────
function fmtN(v: any): string {
  const n = Number(v) || 0;
  return Math.round(n).toLocaleString('en-US');
}

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// ── Main Screen ────────────────────────────────────────────────────────────
export default function CustomerReportScreen() {
  const [name,   setName]   = useState('');
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const dName   = useDebounce(name,   400);
  const dBranch = useDebounce(branch, 400);

  React.useEffect(() => { setPage(1); }, [dName, dBranch, status]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customer-report', dName, dBranch, status, page],
    queryFn: () => api.get('/customer-report/', {
      params: { name: dName||undefined, branch: dBranch||undefined, status: status||undefined, page, page_size: 20 },
    }).then(r => r.data),
  });

  const rows: any[]   = data?.rows ?? data?.clients ?? [];
  const total          = data?.count ?? 0;
  const totalPages     = data?.total_pages ?? 1;

  return (
    <ScreenLayout title="Customer Report" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Filters */}
        <View style={s.filtersCard}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput style={s.searchInput} value={name} onChangeText={setName}
              placeholder="Search by name..." placeholderTextColor={Colors.textMuted} />
            {name.length > 0 && <TouchableOpacity onPress={() => setName('')}><Text style={s.clearBtn}>✕</Text></TouchableOpacity>}
          </View>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🏦</Text>
            <TextInput style={s.searchInput} value={branch} onChangeText={setBranch}
              placeholder="Filter by branch..." placeholderTextColor={Colors.textMuted} />
            {branch.length > 0 && <TouchableOpacity onPress={() => setBranch('')}><Text style={s.clearBtn}>✕</Text></TouchableOpacity>}
          </View>
          <View style={s.chipRow}>
            {STATUSES.map(st => (
              <TouchableOpacity key={st.value} style={[s.chip, status===st.value && s.chipActive]} onPress={() => setStatus(st.value)}>
                <Text style={[s.chipText, status===st.value && s.chipTextActive]}>{st.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsBanner}>
          <View style={s.statItem}><Text style={[s.statVal,{color:Colors.primary}]}>{total}</Text><Text style={s.statLbl}>Records</Text></View>
          <View style={s.statDiv} />
          <View style={s.statItem}><Text style={[s.statVal,{color:TEAL}]}>{rows.filter(r=>r.status==='active').length}</Text><Text style={s.statLbl}>Active</Text></View>
          <View style={s.statDiv} />
          <View style={s.statItem}><Text style={[s.statVal,{color:Colors.textMuted}]}>{rows.filter(r=>r.status==='completed').length}</Text><Text style={s.statLbl}>Completed</Text></View>
        </View>

        {(isLoading || isFetching) && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}

        {/* Results table */}
        {rows.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
            <View style={s.table}>
              {/* Header */}
              <View style={[s.row, s.headerRow]}>
                {['S/N','Name','Phone','Branch','Type','Loan Amount','Outstanding','Status','Loans'].map(h => (
                  <Text key={h} style={[s.cell, s.hText,
                    h==='S/N'    ? {width:36} :
                    h==='Name'   ? {width:150} :
                    h==='Phone'  ? {width:110} :
                    h==='Branch' ? {width:100} :
                    h==='Type'   ? {width:80}  :
                    h==='Loans'  ? {width:80}  :
                    h==='Status' ? {width:80}  :
                    {width:110, textAlign:'right'}]}>
                    {h}
                  </Text>
                ))}
              </View>

              {rows.map((r: any, i: number) => {
                const rowStart = (page-1)*20;
                const isActive = r.status === 'active';
                return (
                  <View key={r.loan_id ?? i} style={[s.row, i%2===1 && s.rowAlt]}>
                    <Text style={[s.cell,{width:36,color:Colors.textMuted}]}>{rowStart+i+1}</Text>
                    <Text style={[s.cell,{width:150,fontWeight:'600'}]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[s.cell,{width:110,color:Colors.textMuted}]}>{r.phone}</Text>
                    <Text style={[s.cell,{width:100,color:Colors.textMuted}]} numberOfLines={1}>{r.office}</Text>
                    <Text style={[s.cell,{width:80,color:Colors.textMuted}]}>{r.loan_type}</Text>
                    <Text style={[s.cell,{width:110,textAlign:'right'}]}>{fmtN(r.loan_amount)}</Text>
                    <View style={[s.cell,{width:110, backgroundColor: isActive ? PURPLE_BG : 'transparent', borderRadius:4}]}>
                      <Text style={{textAlign:'right',fontSize:11,fontWeight:isActive?'700':'400',color:isActive?'#8b3a8b':Colors.textMuted}}>
                        {isActive ? fmtN(r.outstanding) : '-'}
                      </Text>
                    </View>
                    <View style={[s.cell,{width:80}]}>
                      <View style={[s.statusBadge, {backgroundColor: isActive ? Colors.error+'18' : Colors.success+'18'}]}>
                        <Text style={[s.statusText, {color: isActive ? Colors.error : Colors.success}]}>
                          {isActive ? 'Active' : 'Done'}
                        </Text>
                      </View>
                    </View>
                    {/* View all loans button */}
                    <TouchableOpacity style={[s.cell,{width:80}]}
                      onPress={() => setSelectedClient({
                        id: r.client_id, name: r.name,
                        checkno: r.checkno ?? '', branch: r.office
                      })}>
                      <View style={s.viewBtn}>
                        <Text style={s.viewBtnText}>👁 View</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Footer */}
              <View style={[s.row, s.footerRow]}>
                <Text style={[s.cell,s.footText,{width:36+150+110+100+80}]}>Showing {rows.length} of {total}</Text>
                <Text style={[s.cell,s.footText,{width:110,textAlign:'right'}]}>
                  {fmtN(rows.reduce((a:number,r:any)=>a+(Number(r.loan_amount)||0),0))}
                </Text>
                <Text style={[s.cell,s.footText,{width:110,textAlign:'right'}]}>
                  {fmtN(rows.reduce((a:number,r:any)=>a+(Number(r.outstanding)||0),0))}
                </Text>
                <Text style={[s.cell,{width:80+80}]}> </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Empty */}
        {!isLoading && rows.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{fontSize:36}}>👤</Text>
            <Text style={s.emptyText}>No customers found.</Text>
            {(name||branch||status) && (
              <TouchableOpacity onPress={()=>{setName('');setBranch('');setStatus('');}}>
                <Text style={s.clearFilters}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity style={[s.pageBtn, page===1 && s.pageBtnDisabled]}
              onPress={() => page > 1 && setPage(p=>p-1)} disabled={page===1}>
              <Text style={s.pageBtnText}>‹ Prev</Text>
            </TouchableOpacity>
            <Text style={s.pageInfo}>Page {page} of {totalPages}</Text>
            <TouchableOpacity style={[s.pageBtn, page===totalPages && s.pageBtnDisabled]}
              onPress={() => page < totalPages && setPage(p=>p+1)} disabled={page===totalPages}>
              <Text style={s.pageBtnText}>Next ›</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Client loans modal */}
      {selectedClient && (
        <ClientLoansModal
          client={selectedClient}
          visible={!!selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </ScreenLayout>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  filtersCard: { margin:Spacing.base, marginBottom:Spacing.sm, backgroundColor:Colors.surface, borderRadius:Radius.lg, padding:Spacing.base, ...Shadow.sm, gap:Spacing.sm },
  searchBox: { flexDirection:'row', alignItems:'center', gap:8, borderWidth:1.5, borderColor:Colors.border, borderRadius:Radius.md, paddingHorizontal:10, backgroundColor:Colors.surfaceAlt },
  searchIcon: { fontSize:14 }, searchInput: { flex:1, fontSize:Typography.sizes.sm, color:Colors.text, paddingVertical:10 }, clearBtn: { color:Colors.textMuted, padding:4 },
  chipRow: { flexDirection:'row', gap:Spacing.xs },
  chip: { paddingHorizontal:14, paddingVertical:7, borderRadius:Radius.full, borderWidth:1.5, borderColor:Colors.border, backgroundColor:Colors.surfaceAlt },
  chipActive: { backgroundColor:NAVY, borderColor:NAVY },
  chipText: { fontSize:Typography.sizes.xs, color:Colors.textSecondary, fontWeight:'500' },
  chipTextActive: { color:'#fff', fontWeight:'600' },
  statsBanner: { flexDirection:'row', backgroundColor:Colors.surface, marginHorizontal:Spacing.base, marginBottom:Spacing.sm, borderRadius:Radius.lg, ...Shadow.sm, overflow:'hidden' },
  statItem: { flex:1, alignItems:'center', paddingVertical:10 }, statDiv: { width:1, backgroundColor:Colors.border },
  statVal: { fontSize:Typography.sizes.base, fontWeight:'700' }, statLbl: { fontSize:Typography.sizes.xs, color:Colors.textMuted, marginTop:1 },
  table: { borderRadius:Radius.md, overflow:'hidden', borderWidth:1, borderColor:Colors.border },
  row: { flexDirection:'row', alignItems:'center', paddingVertical:10, paddingHorizontal:6, borderBottomWidth:1, borderBottomColor:Colors.border },
  rowAlt: { backgroundColor:Colors.surfaceAlt },
  headerRow: { backgroundColor:TEAL, borderBottomWidth:0 },
  footerRow: { backgroundColor:NAVY, borderBottomWidth:0 },
  cell: { fontSize:11, color:Colors.text, paddingHorizontal:3 },
  hText: { color:'#fff', fontWeight:'700', textTransform:'uppercase', letterSpacing:0.3 },
  footText: { color:'#fff', fontWeight:'700', fontSize:11 },
  statusBadge: { borderRadius:Radius.full, paddingVertical:3, paddingHorizontal:6, alignItems:'center' },
  statusText: { fontSize:10, fontWeight:'700' },
  viewBtn: { backgroundColor:TEAL, borderRadius:3, paddingHorizontal:8, paddingVertical:4, alignItems:'center' },
  viewBtnText: { color:'#fff', fontSize:10, fontWeight:'600' },
  emptyBox: { alignItems:'center', paddingTop:40, gap:Spacing.sm },
  emptyText: { color:Colors.textMuted, fontSize:Typography.sizes.sm },
  clearFilters: { color:Colors.primary, fontSize:Typography.sizes.sm, textDecorationLine:'underline' },
  pagination: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.md, padding:Spacing.base },
  pageBtn: { backgroundColor:NAVY, borderRadius:Radius.md, paddingHorizontal:16, paddingVertical:8 },
  pageBtnDisabled: { backgroundColor:Colors.textMuted },
  pageBtnText: { color:'#fff', fontWeight:'600', fontSize:Typography.sizes.sm },
  pageInfo: { fontSize:Typography.sizes.sm, color:Colors.textSecondary, fontWeight:'500' },
});

// ── Modal Styles: Schedule ─────────────────────────────────────────────────
const ms = StyleSheet.create({
  root: { flex:1, justifyContent:'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor:'#fff', borderTopLeftRadius:16, borderTopRightRadius:16, maxHeight:H*0.88 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:Spacing.base, borderBottomWidth:2, borderBottomColor:NAVY },
  headerTitle: { fontSize:14, fontWeight:'800', color:NAVY, textDecorationLine:'underline', letterSpacing:0.5 },
  headerSub: { fontSize:11, color:Colors.textSecondary, marginTop:3 },
  headerBold: { fontWeight:'700', color:NAVY },
  closeBtn: { padding:4 }, closeBtnText: { fontSize:18, color:Colors.textMuted },
  row: { flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:8, borderBottomWidth:1, borderBottomColor:'#e8f4f8' },
  rowAlt: { backgroundColor:'#f0f8ff' },
  cell: { fontSize:11, color:Colors.text, paddingHorizontal:4 },
  thead: { backgroundColor:TEAL, borderBottomWidth:0 },
  theadText: { color:'#fff', fontWeight:'700', fontSize:11 },
  tfoot: { backgroundColor:GOLD, borderBottomWidth:0 },
  tfootText: { color:'#1a1a1a', fontWeight:'700', fontSize:11 },
  // Re Schedule action row — matches web screenshot's orange CTA
  actionsRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    padding: Spacing.base, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm,
  },
  reScheduleBtn: {
    backgroundColor: '#f5811f', paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: Radius.md, elevation: 2,
    shadowColor: '#f5811f', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  reScheduleBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
});

// ── Modal Styles: Client Loans ─────────────────────────────────────────────
const cl = StyleSheet.create({
  root: { flex:1, justifyContent:'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor:'#fff', borderTopLeftRadius:16, borderTopRightRadius:16, maxHeight:H*0.92 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:Spacing.base, borderBottomWidth:2, borderBottomColor:NAVY },
  headerTitle: { fontSize:13, fontWeight:'800', color:NAVY, textDecorationLine:'underline' },
  headerSub: { fontSize:11, color:Colors.textSecondary, marginTop:4 },
  headerBold: { fontWeight:'700', color:NAVY },
  closeBtn: { padding:4 }, closeBtnText: { fontSize:18, color:Colors.textMuted },
  row: { flexDirection:'row', alignItems:'center', paddingVertical:9, paddingHorizontal:6, borderBottomWidth:1, borderBottomColor:Colors.border },
  rowAlt: { backgroundColor:Colors.surfaceAlt },
  cell: { fontSize:11, color:Colors.text, paddingHorizontal:3 },
  thead: { backgroundColor:TEAL, borderBottomWidth:0 },
  theadText: { color:'#fff', fontWeight:'700', fontSize:10, textTransform:'uppercase' },
  tfoot: { backgroundColor:GOLD, borderBottomWidth:0 },
  tfootText: { color:'#1a1a1a', fontWeight:'700', fontSize:11 },
  viewBtn: { backgroundColor:TEAL, borderRadius:3, paddingHorizontal:7, paddingVertical:4, alignItems:'center' },
  viewBtnText: { color:'#fff', fontSize:10, fontWeight:'600' },
  approveBtn: { backgroundColor:'#f39c12', borderRadius:3, paddingHorizontal:7, paddingVertical:4, alignItems:'center' },
  approveBtnText: { color:'#fff', fontSize:10, fontWeight:'700' },
  deleteBtn: { backgroundColor: '#dc2626', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Delete confirmation modal
  delOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  delBox: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, overflow: 'hidden' },
  delHeader: { backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delHeaderText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  delBody: { padding: 20, alignItems: 'center' },
  delIconRing: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  delTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4, textAlign: 'center' },
  delLabel: { fontSize: 13, color: '#dc2626', fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  delDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: 12, lineHeight: 17 },
  delNotice: { backgroundColor: '#fef2f2', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#fecaca' },
  delNoticeText: { fontSize: 11, color: '#7f1d1d', lineHeight: 16 },
  delFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  delCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  delCancelText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  delGoBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#dc2626' },
  delGoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  completedBadge: { backgroundColor:Colors.success, borderRadius:3, paddingHorizontal:7, paddingVertical:4, alignItems:'center' },
  completedText: { color:'#fff', fontSize:10, fontWeight:'700' },
});
