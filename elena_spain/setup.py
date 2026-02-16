import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup_verifactu_fields():
    custom_fields = {
        "Sales Invoice": [
            {"fieldname": "verifactu_section", "label": "Verifactu", "fieldtype": "Section Break", "insert_after": "items"},
            {"fieldname": "ef_hash", "label": "Hash Factura", "fieldtype": "Read Only", "insert_after": "verifactu_section"},
            {"fieldname": "ef_hash_anterior", "label": "Hash Anterior", "fieldtype": "Read Only", "insert_after": "ef_hash"},
            {"fieldname": "ef_qr_code", "label": "Código QR AEAT", "fieldtype": "HTML", "insert_after": "ef_hash_anterior"},
            {"fieldname": "ef_enviado_aeat", "label": "Enviado a AEAT", "fieldtype": "Check", "read_only": 1, "insert_after": "ef_qr_code"}
        ]
    }
    create_custom_fields(custom_fields)
    frappe.db.commit()
