"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { complaintsService } from "@/features/complaints/services/complaints.service";
import { formatPriceWithUnit } from "@/utils/number.utils";
import { toJalaliWithTime } from "@/utils/date.utils";
import type { Complaint } from "@/features/complaints/types/complaints.types";

export default function TrackComplaintPage() {
  const params = useParams();
  const uuidParam = params?.uuid as string;

  const [uuid, setUuid]         = useState(uuidParam || "");
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");

  const handleFetch = async (targetUuid: string) => {
    if (!targetUuid) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await complaintsService.trackComplaint(targetUuid);
      setComplaint(res.data);
    } catch (err) {
      setError("شکایتی با این شناسه یافت نشد.");
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (uuidParam) {
      handleFetch(uuidParam);
    }
  }, [uuidParam]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-700">رهگیری وضعیت شکایت</h1>
        <p className="text-sm text-slate-500 mt-1">مشاهده آخرین وضعیت رسیدگی بازرسان به پرونده گران‌فروشی</p>
      </div>

      {/* Search Bar */}
      <div className="card p-6 flex gap-3">
        <Input
          placeholder="شناسه پیگیری (UUID) را وارد کنید..."
          value={uuid}
          onChange={(e) => setUuid(e.target.value)}
        />
        <Button onClick={() => handleFetch(uuid)} isLoading={isLoading}>
          استعلام
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {/* Complaint Result */}
      {complaint && (
        <Card className="space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-400">شناسه پرونده: <span className="font-mono font-bold text-slate-700">{complaint.uuid}</span></p>
              <h3 className="text-lg font-bold text-primary-700 mt-1">{complaint.title}</h3>
            </div>
            <Badge variant="info" size="md">{complaint.status_display}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-slate-400 block text-xs">فروشگاه متخلف:</span>
              <span className="font-bold text-slate-800">{complaint.store_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">محصول:</span>
              <span className="font-bold text-slate-800">{complaint.product_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">قیمت پرداختی شما:</span>
              <span className="font-bold text-red-600">{formatPriceWithUnit(complaint.price_reported)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">تاریخ ثبت:</span>
              <span className="font-medium text-slate-700">{toJalaliWithTime(complaint.created_at)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-2">شرح شکایت:</h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">
              {complaint.description}
            </p>
          </div>

          {complaint.resolution_note && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <h4 className="font-bold text-green-900 text-sm mb-1">نتیجه نهایی بررسی:</h4>
              <p className="text-xs text-green-800 leading-relaxed">{complaint.resolution_note}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}