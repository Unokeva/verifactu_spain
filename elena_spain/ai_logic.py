import frappe
from google import genai
import json
import mimetypes
import os
import re

@frappe.whitelist()
def process_invoice_with_gemini(file_url):
    # 1. Credenciales y Cliente
    api_key = frappe.conf.get('elena_gemini_key')
    api_key = str(api_key).strip().strip(',').strip('"')
    client = genai.Client(api_key=api_key)

    # 2. Selección de Modelo
    selected_model = "gemini-2.5-pro" 

    # 3. Localizar archivo
    file_name = file_url.split('/')[-1]
    site_path = frappe.get_site_path()
    file_path = os.path.join(site_path, 'public', 'files', file_name)
    if not os.path.exists(file_path):
        file_path = os.path.join(site_path, 'private', 'files', file_name)

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    mime_type, _ = mimetypes.guess_type(file_path)

    # 4. Datos de contexto
    my_company = frappe.db.get_value("Global Defaults", None, "default_company") or "EMPRESA RECEPTORA"
    my_nif = frappe.db.get_value("Company", my_company, "tax_id") or ""

    # 5. EL PROMPT MAESTRO
    prompt = f"""
    Actúa como un Senior Accountant experto en el PGC de España.
    Analiza la factura adjunta con rigor absoluto.

    REGLAS DE CLASIFICACIÓN:
    - 'MERCADERIAS': Compras de stock o productos para la venta.
    - 'ARRENDAMIENTOS': Alquileres.
    - 'SUMINISTROS': Electricidad, Agua, Gas.
    - 'COMUNICACIONES': Telefonía e Internet.
    - 'SERVICIOS': Gastos varios, Amazon, reparaciones, honorarios.

    INDICACIONES CRÍTICAS:
    - EMISOR: Identifica al vendedor. IGNORA mis datos: {my_company} ({my_nif}).
    - IRPF: Detecta retenciones (ej: 15). Si no hay, 0.
    - RECARGO: Detecta Recargo de Equivalencia (ej: 5.2). Si no hay, 0.
    - TABLA: 'description' (max 140 chars), 'qty', 'rate' (base imponible), 'tax_percent' (IVA).

    Responde EXCLUSIVAMENTE con este JSON:
    {{
        "vendor_name": "Nombre Fiscal",
        "vendor_nif": "NIF sin espacios",
        "date": "YYYY-MM-DD",
        "invoice_number": "Número",
        "category": "MERCADERIAS | ARRENDAMIENTOS | SUMINISTROS | COMUNICACIONES | SERVICIOS",
        "irpf_percent": 0,
        "re_percent": 0,
        "items": [
            {{ "description": "...", "qty": 1.0, "rate": 0.00, "tax_percent": 21 }}
        ]
    }}
    """

    try:
        response = client.models.generate_content(
            model=selected_model,
            contents=[
                prompt,
                genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type or "application/pdf")
            ],
            config=genai.types.GenerateContentConfig(temperature=0.0)
        )

        res_text = response.text.strip()
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()

        data = json.loads(res_text)

        # --- MEJORA: REVISIÓN DE NÚMERO DE FACTURA ÚNICO ---
        bill_no = data.get('invoice_number')
        if bill_no:
            # Buscamos si el número de factura ya existe en cualquier Purchase Invoice (borradores o enviadas)
            duplicate = frappe.db.get_value("Purchase Invoice", 
                {"bill_no": bill_no, "docstatus": ["<", 2]}, 
                ["name", "supplier"]
            )
            if duplicate:
                # duplicate[0] es el nombre del doc, duplicate[1] es el proveedor
                frappe.throw(f"¡Número de factura DUPLICADO! La factura {bill_no} ya fue registrada para {duplicate[1]} (Documento: {duplicate[0]})")

        # 6. Resolución y Creación Forzosa de Proveedor
        data['supplier'] = get_or_create_vendor(data.get('vendor_nif'), data.get('vendor_name'))
        data['file_url'] = file_url

        return data

    except Exception as e:
        if "DUPLICADO" in str(e):
            raise e
        frappe.log_error(frappe.get_traceback(), "Elena AI Error")
        if "429" in str(e):
            frappe.throw("Límite de velocidad de Google. Espera 10 segundos y reintenta.")
        frappe.throw(f"Error Elena: {str(e)}")

def get_or_create_vendor(nif, name):
    if not nif: return None
    nif_c = "".join(filter(str.isalnum, nif)).upper()
    nif_sin_prefijo = re.sub(r'^[A-Z]{2}', '', nif_c) 
    
    supplier = frappe.db.get_value("Supplier", {"tax_id": ["in", [nif_c, nif_sin_prefijo]]}, "name")

    if not supplier:
        try:
            safe_name = (name or nif_c)[:140].strip()
            new_doc = frappe.get_doc({
                "doctype": "Supplier",
                "supplier_name": safe_name,
                "tax_id": nif_c,
                "supplier_group": "All Supplier Groups",
                "is_transporter": 0,
                "is_internal_supplier": 0
            })
            new_doc.insert(ignore_permissions=True, ignore_if_duplicate=True)
            frappe.db.commit()
            supplier = new_doc.name
        except Exception as e:
            supplier = frappe.db.get_value("Supplier", {"supplier_name": name}, "name")
            if not supplier:
                return name 
    return supplier