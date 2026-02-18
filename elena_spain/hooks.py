app_name = "elena_spain"
app_title = "Elena Localización España"
app_publisher = "Unokeva"
app_description = "Módulo Verifactu y Auditoría IA PGC con Gemini"
app_email = "javier.bogarra@gmail.com"
app_license = "gpl-3.0"

# --- EVENTOS DE DOCUMENTOS (VERIFACTU) ---
doc_events = {
    "Sales Invoice": {
        "on_submit": "elena_spain.verifactu.logic.calculate_hash"
    }
}

# --- INTEGRACIÓN DE SCRIPTS (ELENA AI) ---
# Esto inyecta el código JS en el formulario de Factura de Compra automáticamente
doctype_js = {
    "Purchase Invoice": "public/js/purchase_invoice.js"
}

# --- EXPORTACIÓN DE CONFIGURACIÓN (FIXTURES) ---
# Esto asegura que tus Custom Fields y configuraciones viajen en el repositorio
fixtures = [
    {
        "dt": "Custom Field", 
        "filters": [["dt", "in", ["Purchase Invoice", "Sales Invoice"]]]
    },
    {
        "dt": "Property Setter",
        "filters": [["doc_type", "in", ["Purchase Invoice", "Sales Invoice"]]]
    }
]

# --- PERMISOS Y SEGURIDAD ---
# Las funciones de IA ya se exponen vía @frappe.whitelist() en el .py, 
# pero aquí definimos integraciones si fueran necesarias.