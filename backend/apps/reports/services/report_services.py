from io import BytesIO
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from apps.pricing.selectors import StorePriceSelector
from apps.complaints.selectors import ComplaintSelector

class ReportService:

    def generate_overpricing_report(self, union_id: int, date) -> bytes:
        """
        تولید گزارش Excel از گران‌فروشی‌های یک اتحادیه در یک روز.
        """
        overpriced_items = StorePriceSelector.get_overpriced_today(
            union_id=union_id, date=date
        )

        workbook = openpyxl.Workbook()
        ws = workbook.active
        ws.title = "گزارش گران‌فروشی"
        ws.sheet_view.rightToLeft = True

        headers = [
            'فروشگاه', 'محصول', 'قیمت مصوب', 'قیمت فروشگاه', 'مبلغ تخلف'
        ]
        ws.append(headers)

        for item in overpriced_items:
            violation_amount = item.price - item.official_price_amount
            ws.append([
                item.store.name,
                item.product.name,
                item.official_price_amount,
                item.price,
                violation_amount
            ])

        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        return output.getvalue()