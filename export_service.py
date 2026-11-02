import io
import xlsxwriter
from datetime import datetime

def generate_ideas_excel(ideas: list, sheet_title: str = "G'oyalar") -> io.BytesIO:
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet(sheet_title[:31])

    # Formats
    header_format = workbook.add_format({
        'bold': True,
        'font_color': '#FFFFFF',
        'bg_color': '#111c30',
        'border': 1,
        'border_color': '#334155',
        'align': 'center',
        'valign': 'vcenter',
        'font_size': 11,
        'font_name': 'Segoe UI'
    })

    title_format = workbook.add_format({
        'bold': True,
        'font_color': '#e8bd68',
        'bg_color': '#080d19',
        'align': 'left',
        'font_size': 16,
        'font_name': 'Segoe UI'
    })

    sub_title_format = workbook.add_format({
        'font_color': '#94a3b8',
        'bg_color': '#080d19',
        'align': 'left',
        'font_size': 10,
        'font_name': 'Segoe UI'
    })

    cell_format = workbook.add_format({
        'font_name': 'Segoe UI',
        'font_size': 10,
        'valign': 'top',
        'text_wrap': True,
        'border': 1,
        'border_color': '#cbd5e1'
    })

    status_approved = workbook.add_format({
        'font_name': 'Segoe UI',
        'font_size': 10,
        'bold': True,
        'font_color': '#15803d',
        'bg_color': '#dcfce7',
        'align': 'center',
        'valign': 'top',
        'border': 1,
        'border_color': '#86efac'
    })

    status_pending = workbook.add_format({
        'font_name': 'Segoe UI',
        'font_size': 10,
        'bold': True,
        'font_color': '#b45309',
        'bg_color': '#fef3c7',
        'align': 'center',
        'valign': 'top',
        'border': 1,
        'border_color': '#fde68a'
    })

    status_rejected = workbook.add_format({
        'font_name': 'Segoe UI',
        'font_size': 10,
        'bold': True,
        'font_color': '#b91c1c',
        'bg_color': '#fee2e2',
        'align': 'center',
        'valign': 'top',
        'border': 1,
        'border_color': '#fca5a5'
    })

    # Title block
    worksheet.merge_range('A1:L1', "✦ G‘OYALAR BANKI — RASMIY TASHABBUSLAR HISOBOTI", title_format)
    worksheet.merge_range('A2:L2', f"Hisobot shakllantirilgan vaqt: {datetime.now().strftime('%d.%m.%Y %H:%M')} | Jami g‘oyalar: {len(ideas)} ta", sub_title_format)
    worksheet.set_row(0, 32)
    worksheet.set_row(1, 20)
    worksheet.set_row(2, 10)

    # Headers
    headers = [
        ("A4", "ID Kodi", 14),
        ("B4", "Sana", 14),
        ("C4", "Yo‘nalish", 20),
        ("D4", "G‘oya Nomi", 26),
        ("E4", "O‘quvchi (F.I.SH)", 22),
        ("F4", "Maktab", 25),
        ("G4", "Sinf", 10),
        ("H4", "Muammo Tavsifi", 35),
        ("I4", "To‘liq Mazmuni", 45),
        ("J4", "Kutilayotgan Natija", 35),
        ("K4", "Holati", 18),
        ("L4", "Koordinator Izohi", 30),
    ]

    for col_idx, (cell, name, width) in enumerate(headers):
        worksheet.write(cell, name, header_format)
        worksheet.set_column(col_idx, col_idx, width)

    worksheet.set_row(3, 26)

    # Fill data
    row_idx = 4
    for idea in ideas:
        worksheet.write(row_idx, 0, idea.get('tracking_code', ''), cell_format)
        worksheet.write(row_idx, 1, str(idea.get('created_at', ''))[:16], cell_format)
        worksheet.write(row_idx, 2, idea.get('category_name', ''), cell_format)
        worksheet.write(row_idx, 3, idea.get('title', ''), cell_format)
        
        full_name = f"{idea.get('first_name', '')} {idea.get('last_name', '')}".strip()
        worksheet.write(row_idx, 4, full_name, cell_format)
        worksheet.write(row_idx, 5, idea.get('school', ''), cell_format)
        worksheet.write(row_idx, 6, idea.get('class_name', ''), cell_format)
        worksheet.write(row_idx, 7, idea.get('problem', ''), cell_format)
        worksheet.write(row_idx, 8, idea.get('description', ''), cell_format)
        worksheet.write(row_idx, 9, idea.get('expected_result', ''), cell_format)

        # Status format
        status = idea.get('status', 'Ko‘rib chiqilmoqda')
        if status == 'Ma‘qullandi':
            s_fmt = status_approved
        elif status == 'Rad etildi':
            s_fmt = status_rejected
        else:
            s_fmt = status_pending

        worksheet.write(row_idx, 10, status, s_fmt)
        worksheet.write(row_idx, 11, idea.get('latest_comment', '') or '', cell_format)

        worksheet.set_row(row_idx, 60)
        row_idx += 1

    workbook.close()
    output.seek(0)
    return output
