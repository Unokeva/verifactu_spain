app_name = "elena_spain"
app_title = "Elena Localización España"
app_publisher = "Unokeva"
app_description = "Módulo Verifactu y Auditoría IA PGC con Gemini"
app_email = "javier.bogarra@gmail.com"
app_license = "gpl-3.0"

# --- EVENTOS DE DOCUMENTOS (VERIFACTU) ---
# Asegúrate de que logic.py esté en la carpeta /verifactu/
doc_events = {
    "Sales Invoice": {
        "on_submit": "elena_spain.verifactu.logic.calculate_hash"
    }
}

# --- INTEGRACIÓN DE SCRIPTS (ELENA AI) ---
# Inyecta el JS automáticamente desde la nueva ruta física
doctype_js = {
    "Purchase Invoice": "public/js/purchase_invoice.js"
}

# --- MÉTODOS DISPONIBLES (API) ---
# ACTUALIZADO: Ahora apunta a la subcarpeta elena_ai
whitelisted_methods = {
    "process_invoice": "elena_spain.elena_ai.ai_logic.process_invoice_with_gemini"
}

# --- EXPORTACIÓN DE CONFIGURACIÓN (FIXTURES) ---
fixtures = [
    {
        "dt": "Custom Field", 
        "filters": [["dt", "in", ["Purchase Invoice", "Sales Invoice"]]]
    },
    {
        "dt": "Property Setter",
        "filters": [["doc_type", "in", ["Purchase Invoice", "Sales Invoice"]]]
    },
    {
        "dt": "Client Script",
        "filters": [["module", "=", "Elena Localización España"]]
    }
]