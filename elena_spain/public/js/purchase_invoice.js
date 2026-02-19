// =========================================================
// CLIENT SCRIPT: ELENA AI PRO - VERSIÓN FINAL ORGANIZADA
// =========================================================

frappe.ui.form.on('Purchase Invoice', {
    refresh: function(frm) {
        // Añadimos el botón solo si la factura es un borrador y no existe ya el botón
        if (frm.doc.docstatus === 0 && !frm.custom_buttons["🚀 Procesar con Elena Pro"]) {
            frm.add_custom_button('🚀 Procesar con Elena Pro', function() {
                if (frm.doc.custom_elena_file) {
                    abrir_consola_panoramica(frm, frm.doc.custom_elena_file);
                } else {
                    frappe.msgprint(__('Por favor, adjunta el PDF en el campo Elena AI.'));
                }
            }, '⚡ Acciones IA');
        }
    }
});

function abrir_consola_panoramica(frm, file_url) {
    let d = new frappe.ui.Dialog({
        title: '📄 Elena AI Pro: Auditoría PGC & Fiscal',
        size: 'extra_large',
        fields: [{ fieldtype: 'HTML', fieldname: 'layout' }],
        primary_action_label: 'Inyectar Factura',
        primary_action: function() {
            d.hide();
            ejecutar_inyeccion_maestra(frm, d.data_ia);
        }
    });

    d.fields_dict.layout.$wrapper.html(`
        <style>
            .modal-dialog { max-width: 98vw !important; margin: 1vh auto !important; }
            .modal-content { height: 96vh !important; border: none; }
            .elena-main { display: flex; height: 88vh; background: #f4f5f6; }
            .elena-pdf { flex: 5.5; background: #333; }
            .elena-data { flex: 2; background: white; padding: 25px; overflow-y: auto; border-left: 4px solid #1a73e8; }
            .ia-group-title { font-size: 12px; font-weight: 700; color: #1a73e8; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .ia-label { font-size: 11px; color: #888; text-transform: uppercase; margin-top: 8px; font-weight: bold; }
            .ia-value { font-size: 14px; font-weight: 600; color: #222; margin-bottom: 10px; word-break: break-all; }
            .ia-table { width: 100%; margin-top: 15px; font-size: 11px; border-collapse: collapse; }
            .ia-table th { background: #f8f9fa; border-bottom: 2px solid #1a73e8; padding: 8px 5px; text-align: left; color: #555; }
            .ia-table td { padding: 10px 5px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
            .badge-account { background: #fff3e0; color: #e65100; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: bold; border: 1px solid #ffe0b2; }
            .badge-pgc { background: #e8f0fe; color: #1967d2; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
            .text-right { text-align: right; }
        </style>
        <div class="elena-main">
            <div class="elena-pdf">
                <iframe src="${file_url}#toolbar=0&navpanes=0&view=FitH" width="100%" height="100%" style="border:none;"></iframe>
            </div>
            <div class="elena-data" id="ia-content">
                <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <br><br>
                    <strong>Elena AI realizando auditoría fiscal...</strong>
                </div>
            </div>
        </div>
    `);
    d.show();

    // RUTA CORREGIDA: Apunta ahora al módulo elena_ai
    frappe.call({
        method: "elena_spain.elena_ai.ai_logic.process_invoice_with_gemini",
        args: { file_url: file_url },
        callback: function(r) {
            if (r.message) {
                d.data_ia = r.message;
                renderizar_ia_ui(r.message);
            }
        }
    });
}

function renderizar_ia_ui(data) {
    const cuenta_map = {
        'MERCADERIAS': 'Compras de Mercaderías - BI',
        'ARRENDAMIENTOS': 'Alquiler de oficina - BI',
        'SUMINISTROS': 'Servicios públicos - BI',
        'SERVICIOS': 'Gastos varios - BI',
        'COMUNICACIONES': 'Cuenta telefonica - BI'
    };
    let cuenta_destino = cuenta_map[data.category] || 'Gastos varios - BI';

    let rows = (data.items || []).map(i => `
        <tr>
            <td>${i.qty || 1}</td>
            <td>
                ${(i.description || 'Sin descripción')}
                <div style="margin-top:4px;"><span class="badge-account">➡️ Cuenta: ${cuenta_destino}</span></div>
            </td>
            <td class="text-right"><strong>${(i.rate || 0).toFixed(2)}€</strong></td>
        </tr>
    `).join('');

    let extras_html = "";
    if(data.irpf_percent > 0) extras_html += `<div class="ia-label">Retención IRPF</div><div class="ia-value" style="color:#d32f2f;">-${data.irpf_percent}%</div>`;
    if(data.re_percent > 0) extras_html += `<div class="ia-label">Recargo Eq.</div><div class="ia-value" style="color:#2e7d32;">+${data.re_percent}%</div>`;

    $('#ia-content').html(`
        <div class="ia-group-title">Emisor Detectado</div>
        <div class="ia-label">Proveedor</div><div class="ia-value">${data.vendor_name || '---'}</div>
        <div class="ia-label">NIF / CIF</div><div class="ia-value">${data.vendor_nif || '---'}</div>
        
        <div class="ia-group-title" style="margin-top:15px;">Mapeo Contable</div>
        <div class="ia-label">Categoría</div>
        <div class="ia-value"><span class="badge-pgc">${data.category || 'SERVICIOS'}</span></div>
        ${extras_html}

        <div class="ia-group-title" style="margin-top:20px;">Líneas de Factura</div>
        <table class="ia-table">
            <thead><tr><th>Cant.</th><th>Descripción</th><th class="text-right">Precio</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `);
}

async function ejecutar_inyeccion_maestra(frm, data) {
    if (!data) return;
    frappe.dom.freeze(__('Elena sincronizando datos con el PGC...'));
    
    try {
        let supplier_id = data.supplier;

        if (supplier_id) {
            await frm.set_value('supplier', supplier_id);
            if (!frm.doc.supplier_name) {
                await frm.trigger('supplier'); 
            }
            await new Promise(resolve => setTimeout(resolve, 1200));
        }

        await frm.set_value('bill_no', data.invoice_number);
        await frm.set_value('bill_date', data.date);

        // --- MEJORA: SELECCIÓN DE PLANTILLA DE IMPUESTOS (COMPRAS) EN CABECERA ---
        await frm.set_value('taxes_and_charges', "Spain Tax - BI");
        
        frm.clear_table('items');
        frm.clear_table('taxes');

        const cuenta_map = {
            'MERCADERIAS': 'Compras de Mercaderías - BI',
            'ARRENDAMIENTOS': 'Alquiler de oficina - BI',
            'SUMINISTROS': 'Servicios públicos - BI',
            'SERVICIOS': 'Gastos varios - BI',
            'COMUNICACIONES': 'Cuenta telefonica - BI'
        };
        let cuenta_gasto = cuenta_map[data.category] || 'Gastos varios - BI';

        for (let item of (data.items || [])) {
            let row = frm.add_child('items');
            let desc_segura = (item.description || "Sin descripción").substring(0, 140);
            
            await frappe.model.set_value(row.doctype, row.name, {
                'item_name': desc_segura,
                'description': item.description,
                'qty': item.qty || 1,
                'rate': item.rate || 0,
                'uom': 'Nos.', 
                'expense_account': cuenta_gasto,
                'conversion_factor': 1.0
            });

            // --- LÓGICA ORIGINAL DE ARTÍCULOS (SE MANTIENE CADA UNO CON SU IVA) ---
            let t = parseInt(item.tax_percent);
            let plantilla = (t === 21) ? "IVA 21% Compras ESP - BI" : 
                            (t === 10) ? "IVA 10% Compras ESP - BI" : 
                            (t === 4) ? "IVA 4% Compras ESP - BI" : "IVA 0% Compras ESP - BI";
            
            await frappe.model.set_value(row.doctype, row.name, 'item_tax_template', plantilla);
        }

        if (data.irpf_percent > 0) {
            let r_irpf = frm.add_child('taxes');
            await frappe.model.set_value(r_irpf.doctype, r_irpf.name, {
                'charge_type': 'On Net Total', 
                'account_head': 'Retenciones IRPF - BI', 
                'description': `Retención IRPF (-${data.irpf_percent}%)`,
                'rate': -data.irpf_percent, 
                'add_deduct_tax': 'Deduct',
                'category': 'Total'
            });
        }

        if (data.re_percent > 0) {
            let r_re = frm.add_child('taxes');
            await frappe.model.set_value(r_re.doctype, r_re.name, {
                'charge_type': 'On Net Total',
                'account_head': 'IVA Soportado Recargo Eq - BI',
                'description': `Recargo de Equivalencia (+${data.re_percent}%)`,
                'rate': data.re_percent,
                'add_deduct_tax': 'Add',
                'category': 'Total'
            });
        }

        frm.refresh_field('items');
        frm.refresh_field('taxes');
        
        // --- TRIGGER FINAL: ACTIVA EL CÁLCULO DE LA PLANTILLA DE CABECERA ---
        await frm.script_manager.trigger('taxes_and_charges');
        
        frappe.show_alert({message: __('Factura inyectada correctamente'), color: 'green'});
        
    } catch (e) {
        console.error("Error Elena Inyección:", e);
        frappe.msgprint(__('Error al inyectar datos: ') + e.message);
    } finally {
        frappe.dom.unfreeze();
    }
}