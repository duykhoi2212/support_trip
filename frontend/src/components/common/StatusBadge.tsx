import React from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  AlertTriangle,
  Lock,
  Shield,
  Car,
  User as UserIcon,
} from 'lucide-react';
import {
  getAccountStatusLabel,
  getIncidentStatusLabel,
  getRequestStatusLabel,
  getRoleLabel,
  getTripStatusLabel,
} from '../../lib/formatters';

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
          <Shield className="w-3 h-3 mr-1 text-emerald-400" />
          {getRoleLabel(role)}
        </span>
      );
    case 'DRIVER':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <Car className="w-3 h-3 mr-1 text-sky-600" />
          {getRoleLabel(role)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <UserIcon className="w-3 h-3 mr-1 text-emerald-600" />
          {getRoleLabel(role)}
        </span>
      );
  }
};

export const AccountStatusBadge: React.FC<{ status: string; lockedUntil?: string | null }> = ({
  status,
  lockedUntil,
}) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getAccountStatusLabel(status)}
        </span>
      );
    case 'LOCKED_TEMP':
      return (
        <div className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3 mr-1" />
            {getAccountStatusLabel(status)}
          </span>
          {lockedUntil && (
            <span className="text-[11px] text-amber-700 font-medium">
              Đến: {new Date(lockedUntil).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
      );
    case 'LOCKED_PERM':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {getAccountStatusLabel(status)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {getAccountStatusLabel(status)}
        </span>
      );
  }
};

export const TripStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Clock className="w-3 h-3 mr-1" />
          {getTripStatusLabel(status)}
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Lock className="w-3 h-3 mr-1" />
          {getTripStatusLabel(status)}
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {getTripStatusLabel(status)}
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getTripStatusLabel(status)}
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 mr-1" />
          {getTripStatusLabel(status)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {getTripStatusLabel(status)}
        </span>
      );
  }
};

export const RequestStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          {getRequestStatusLabel(status)}
        </span>
      );
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getRequestStatusLabel(status)}
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getRequestStatusLabel(status)}
        </span>
      );
    case 'FAILED':
    case 'REJECTED':
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 mr-1" />
          {getRequestStatusLabel(status)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {getRequestStatusLabel(status)}
        </span>
      );
  }
};

export const IncidentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'NOT_RECEIVED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <Clock className="w-3 h-3 mr-1" />
          {getIncidentStatusLabel(status)}
        </span>
      );
    case 'RECEIVED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getIncidentStatusLabel(status)}
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {getIncidentStatusLabel(status)}
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {getIncidentStatusLabel(status)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {getIncidentStatusLabel(status)}
        </span>
      );
  }
};
