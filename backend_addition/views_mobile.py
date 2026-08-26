"""
MASCO Mobile — Backend Addition
File: api/views_mobile.py

Add these views to api/views.py (or import from here).
Register URL in api/urls.py:
    path('reports/monthly/', views_mobile.api_monthly_summary, name='api_monthly_summary'),
"""

import datetime
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from app.models import (
    LoanApplication, LoanRepayment, Expense,
    Client, Office,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_monthly_summary(request):
    """
    Monthly summary report for the mobile app dashboard/reports screen.
    Query params: month (1-12), year (YYYY), office_id (optional)

    Response:
    {
      "total_disbursed": 5000000,
      "total_collected": 2300000,
      "total_expenses": 400000,
      "new_clients": 12,
      "loans_by_status": {"APPROVED": 34, "COMPLETED": 10, ...},
      "expenses_by_type": {"Benki": 200000, "Taslimu": 200000}
    }
    """
    try:
        month = int(request.GET.get('month', datetime.date.today().month))
        year  = int(request.GET.get('year',  datetime.date.today().year))
    except ValueError:
        return Response({'detail': 'Invalid month/year.'}, status=status.HTTP_400_BAD_REQUEST)

    office_id = request.GET.get('office_id') or request.META.get('HTTP_X_OFFICE_ID')

    # Base querysets filtered to month/year
    loan_qs = LoanApplication.objects.filter(
        application_date__year=year,
        application_date__month=month,
    )
    repayment_qs = LoanRepayment.objects.filter(
        payment_date__year=year,
        payment_date__month=month,
    )
    expense_qs = Expense.objects.filter(
        transaction_date__year=year,
        transaction_date__month=month,
    )
    client_qs = Client.objects.filter(
        registration_date__year=year,
        registration_date__month=month,
    )

    if office_id:
        try:
            office = Office.objects.get(pk=int(office_id))
            loan_qs       = loan_qs.filter(office=office)
            repayment_qs  = repayment_qs.filter(loan__office=office)
            expense_qs    = expense_qs.filter(office=office)
            client_qs     = client_qs.filter(office=office)
        except (Office.DoesNotExist, ValueError):
            pass

    # Totals
    total_disbursed = loan_qs.filter(status='APPROVED').aggregate(
        t=Coalesce(Sum('loan_amount'), 0)
    )['t']

    total_collected = repayment_qs.aggregate(
        t=Coalesce(Sum('amount'), 0)
    )['t']

    total_expenses = expense_qs.aggregate(
        t=Coalesce(Sum('amount'), 0)
    )['t']

    new_clients = client_qs.count()

    # Loans by status
    loans_by_status = {}
    for row in loan_qs.values('status').annotate(c=Count('id')):
        loans_by_status[row['status']] = row['c']

    # Expenses by transaction type label
    TTYPE_LABELS = {1: 'Benki', 2: 'Taslimu', 3: 'Simu'}
    expenses_by_type = {}
    for row in expense_qs.values('transaction_type').annotate(t=Coalesce(Sum('amount'), 0)):
        label = TTYPE_LABELS.get(row['transaction_type'], str(row['transaction_type']))
        expenses_by_type[label] = float(row['t'])

    return Response({
        'month': month,
        'year': year,
        'total_disbursed': float(total_disbursed),
        'total_collected': float(total_collected),
        'total_expenses': float(total_expenses),
        'new_clients': new_clients,
        'loans_by_status': loans_by_status,
        'expenses_by_type': expenses_by_type,
    })
