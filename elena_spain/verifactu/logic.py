import frappe
import hashlib

def calculate_hash(doc, method=None):
    company_nif = frappe.db.get_value("Company", doc.company, "tax_id") or "000000000"
    
    last_invoice = frappe.get_all("Sales Invoice", 
        filters={"docstatus": 1, "name": ["!=", doc.name]}, 
        fields=["ef_hash"], 
        order_by="posting_date desc, posting_time desc", 
        limit=1)
    
    hash_anterior = last_invoice[0].ef_hash if last_invoice else "000000000000"
    
    datos_cadena = f"{company_nif}|{doc.name}|{doc.posting_date}|{doc.grand_total}|{hash_anterior}"
    nuevo_hash = hashlib.sha256(datos_cadena.encode()).hexdigest()
    
    # GUARDAMOS SOLO LA URL, NO EL HTML
    url_aeat = f"https://www2.agenciatributaria.gob.es/wlpl/mda1-zt12/VFC_Cotejo?nif={company_nif}&numf={doc.name}&fec={doc.posting_date}&imp={doc.grand_total}"
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={url_aeat}"
    
    frappe.db.set_value("Sales Invoice", doc.name, {
        "ef_hash": nuevo_hash,
        "ef_hash_anterior": hash_anterior,
        "ef_qr_code": qr_url
    }, update_modified=False)
    
    frappe.db.commit()
